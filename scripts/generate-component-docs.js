import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const formsModelTypesDir = path.resolve(
  __dirname,
  '../node_modules/@defra/forms-model/dist/types'
)
const componentsOutputDir = path.resolve(
  __dirname,
  '../docs/features/components'
)
const pagesOutputDir = path.resolve(__dirname, '../docs/features/pages')

const metadata = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'component-metadata.json'), 'utf-8')
)

// Properties from FormFieldBase['options'] that apply to every form component.
// These are excluded from per-component option tables since they're universal.
const BASE_OPTION_PROPS = new Set([
  'required',
  'optionalText',
  'classes',
  'customValidationMessages',
  'instructionText'
])

// Known acronyms for label generation
const ACRONYMS = { Uk: 'UK', Os: 'OS', Html: 'HTML' }

// Name fragments that identify geospatial components
const GEOSPATIAL_NAMES = [
  'EastingNorthing',
  'OsGridRef',
  'NationalGrid',
  'LatLong',
  'Geospatial'
]

function toKebabCase(str) {
  return str.replace(
    /([A-Z])/g,
    (match, letter, offset) => (offset > 0 ? '-' : '') + letter.toLowerCase()
  )
}

function toLabel(name) {
  const words = name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
  return words.map((w) => ACRONYMS[w] ?? w).join(' ')
}

function simplifyType(rawType) {
  if (!rawType) return 'unknown'
  const t = rawType.replace(/\s+/g, ' ').trim()
  if (t.startsWith('{')) return 'object'
  if (t.includes('LanguageMessages')) return 'object'
  if (t.includes('ListTypeContent') || t.includes('ListTypeOption'))
    return 'string'
  const withoutUndefined = t.replace(/\s*\|\s*undefined/g, '').trim()
  if (withoutUndefined.endsWith('[]')) {
    return simplifyType(withoutUndefined.slice(0, -2)) + '[]'
  }
  return withoutUndefined
}

function extractTypeLiteralProps(typeNode, sourceFile) {
  const props = []
  if (!ts.isTypeLiteralNode(typeNode)) return props
  for (const member of typeNode.members) {
    if (!ts.isPropertySignature(member)) continue
    const name = member.name.getText(sourceFile)
    const optional = !!member.questionToken
    const rawType = member.type ? member.type.getText(sourceFile) : 'unknown'
    props.push({ name, optional, type: simplifyType(rawType) })
  }
  return props
}

/**
 * Traverse a type node recursively, resolving IndexedAccessTypes by looking up
 * the referenced interface in allInterfaces. Collects all TypeLiteralNode properties.
 *
 * This handles patterns like:
 *   DateFieldBase['options'] & { condition?: string }
 * by resolving DateFieldBase.options → FormFieldBase['options'] & { maxDaysInPast?, maxDaysInFuture? }
 * and continuing to collect all literal members.
 */
function collectProps(
  typeNode,
  sourceFile,
  allInterfaces,
  accessKey,
  depth = 0
) {
  if (depth > 6) return []
  const props = []

  if (ts.isIntersectionTypeNode(typeNode)) {
    for (const member of typeNode.types) {
      props.push(
        ...collectProps(member, sourceFile, allInterfaces, accessKey, depth)
      )
    }
  } else if (ts.isTypeLiteralNode(typeNode)) {
    props.push(...extractTypeLiteralProps(typeNode, sourceFile))
  } else if (ts.isIndexedAccessTypeNode(typeNode)) {
    // Resolve SomeInterface['accessKey'] by looking up the interface
    const { objectType, indexType } = typeNode
    if (ts.isTypeReferenceNode(objectType) && ts.isLiteralTypeNode(indexType)) {
      const ifaceName = objectType.typeName.getText(sourceFile)
      const key = indexType.literal.getText(sourceFile).replace(/['"]/g, '')
      const iface = allInterfaces[ifaceName]
      if (iface && key === accessKey) {
        for (const member of iface.members) {
          if (
            ts.isPropertySignature(member) &&
            member.name.getText(sourceFile) === accessKey &&
            member.type
          ) {
            props.push(
              ...collectProps(
                member.type,
                sourceFile,
                allInterfaces,
                accessKey,
                depth + 1
              )
            )
          }
        }
      }
    }
  }

  return props
}

/**
 * Parse all exported component interfaces from types.d.ts.
 * Returns a map: interfaceName -> { options, schema, hasContent, hasList }
 *
 * - options: component-specific and group-specific options (base props filtered out)
 * - schema: schema constraint properties
 * - hasContent: whether the component has a 'content' property
 * - hasList: whether the component has a 'list' property
 */
function parseComponentInterfaces(dtsPath) {
  const content = fs.readFileSync(dtsPath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    dtsPath,
    content,
    ts.ScriptTarget.Latest,
    true
  )

  // Collect all interfaces for cross-reference resolution
  const allInterfaces = {}
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      allInterfaces[node.name.text] = node
    }
  })

  const result = {}

  ts.forEachChild(sourceFile, (node) => {
    if (
      !ts.isInterfaceDeclaration(node) ||
      !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    )
      return

    const name = node.name.text
    let rawOptions = []
    let schema = []
    let hasContent = false
    let hasList = false

    for (const member of node.members) {
      if (!ts.isPropertySignature(member)) continue
      const propName = member.name.getText(sourceFile)

      if (propName === 'options' && member.type) {
        rawOptions = collectProps(
          member.type,
          sourceFile,
          allInterfaces,
          'options'
        )
      }
      if (propName === 'schema' && member.type) {
        schema = collectProps(member.type, sourceFile, allInterfaces, 'schema')
      }
      if (propName === 'content') hasContent = true
      if (propName === 'list') hasList = true
    }

    // Remove props that exist on every form component (from FormFieldBase['options'])
    const options = rawOptions.filter((p) => !BASE_OPTION_PROPS.has(p.name))

    result[name] = { options, schema, hasContent, hasList }
  })

  return result
}

/**
 * Parse the ComponentType enum to get an ordered list of component names.
 */
function parseComponentOrder(enumsDtsPath) {
  const content = fs.readFileSync(enumsDtsPath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    enumsDtsPath,
    content,
    ts.ScriptTarget.Latest,
    true
  )
  const order = []

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isEnumDeclaration(node) || node.name.text !== 'ComponentType')
      return
    for (const member of node.members) {
      if (ts.isEnumMember(member) && member.initializer) {
        order.push(member.initializer.getText(sourceFile).replace(/['"]/g, ''))
      }
    }
  })

  return order
}

/**
 * Parse ContentComponentsDef and SelectionComponentsDef type aliases to derive categories.
 * Returns a map: componentName -> 'content' | 'selection'
 */
function parseCategories(typesDtsPath) {
  const content = fs.readFileSync(typesDtsPath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    typesDtsPath,
    content,
    ts.ScriptTarget.Latest,
    true
  )

  const categories = {}

  function namesFromUnion(typeNode) {
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.flatMap(namesFromUnion)
    }
    if (ts.isTypeReferenceNode(typeNode)) {
      return [typeNode.typeName.getText(sourceFile)]
    }
    return []
  }

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isTypeAliasDeclaration(node)) return
    const aliasName = node.name.text

    if (aliasName === 'ContentComponentsDef') {
      for (const name of namesFromUnion(node.type)) {
        categories[name.replace(/Component$/, '')] = 'content'
      }
    } else if (aliasName === 'SelectionComponentsDef') {
      for (const name of namesFromUnion(node.type)) {
        categories[name.replace(/Component$/, '')] = 'selection'
      }
    }
  })

  return categories
}

function deriveCategory(name, parsedCategories) {
  if (parsedCategories[name]) return parsedCategories[name]
  if (GEOSPATIAL_NAMES.some((p) => name.includes(p))) return 'geospatial'
  if (name.includes('Payment')) return 'payment'
  return 'input'
}

/**
 * Generate a minimal example JSON for a component based on its structure.
 */
function generateExample(componentName, interfaceData) {
  const example = {
    type: componentName,
    name: 'fieldName',
    title: 'Question title'
  }
  if (interfaceData.hasContent) example.content = ''
  if (interfaceData.hasList) example.list = 'listName'
  if (componentName === 'PaymentField') {
    example.options = { amount: 2000, description: 'Application fee' }
  }
  return example
}

function generateComponentMd(componentName, interfaceData, sidebarPosition) {
  const description = metadata.components[componentName] ?? ''
  const label = toLabel(componentName)
  const { options = [], schema = [] } = interfaceData

  const lines = [
    `---`,
    `sidebar_label: "${label}"`,
    `sidebar_position: ${sidebarPosition}`,
    `---`,
    ``,
    `# ${label}`,
    ``,
    description,
    ``,
    `## JSON definition`,
    ``,
    '```json',
    JSON.stringify(generateExample(componentName, interfaceData), null, 2),
    '```',
    ``
  ]

  if (options.length > 0) {
    lines.push(`## Options`, ``)
    lines.push(`| Property | Type | Required | Description |`)
    lines.push(`|----------|------|----------|-------------|`)
    for (const prop of options) {
      const desc = metadata.properties[prop.name] ?? ''
      lines.push(
        `| \`${prop.name}\` | \`${prop.type}\` | ${prop.optional ? 'No' : 'Yes'} | ${desc} |`
      )
    }
    lines.push(``)
  }

  if (schema.length > 0) {
    lines.push(`## Schema constraints`, ``)
    lines.push(`| Property | Type | Description |`)
    lines.push(`|----------|------|-------------|`)
    for (const prop of schema) {
      const desc = metadata.properties[prop.name] ?? ''
      lines.push(`| \`${prop.name}\` | \`${prop.type}\` | ${desc} |`)
    }
    lines.push(``)
  }

  return lines.join('\n')
}

function generatePageMd(controllerKey) {
  const meta = metadata.pages[controllerKey]
  if (!meta) return null

  const { label, description, controllerValue, uniqueProperties, example } =
    meta

  const lines = [
    `---`,
    `sidebar_label: "${label}"`,
    `sidebar_position: ${meta.sidebarPosition ?? 99}`,
    `---`,
    ``,
    `# ${label}`,
    ``,
    description,
    ``
  ]

  if (controllerValue) {
    lines.push(`**Controller value:** \`"${controllerValue}"\``, ``)
  } else {
    lines.push(
      `**Controller value:** omit the \`controller\` property, or use \`"PageController"\``,
      ``
    )
  }

  lines.push(
    `## JSON definition`,
    ``,
    '```json',
    JSON.stringify(example, null, 2),
    '```',
    ``
  )

  if (uniqueProperties?.length > 0) {
    lines.push(`## Configuration`, ``)
    lines.push(`| Property | Type | Required | Description |`)
    lines.push(`|----------|------|----------|-------------|`)
    for (const prop of uniqueProperties) {
      lines.push(
        `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.description} |`
      )
    }
    lines.push(``)
  }

  return lines.join('\n')
}

function generateComponentsIndex(componentNames, categories) {
  const groups = {
    input: { label: 'Input fields', items: [] },
    selection: { label: 'Selection fields', items: [] },
    content: { label: 'Content components', items: [] },
    payment: { label: 'Payment', items: [] },
    geospatial: { label: 'Geospatial fields', items: [] }
  }

  for (const name of componentNames) {
    const category = categories[name] ?? 'input'
    const label = toLabel(name)
    const slug = toKebabCase(name)
    const description = metadata.components[name] ?? ''
    groups[category]?.items.push({ label, slug, description })
  }

  const lines = [
    `---`,
    `sidebar_position: 1`,
    `---`,
    ``,
    `# Components`,
    ``,
    `Built-in components available for use in your form definitions. Add a component to a page by specifying its \`type\` in the \`components\` array.`,
    ``
  ]

  lines.push(`## ${groups.input.label}`, ``)
  for (const item of groups.input.items) {
    lines.push(`- [**${item.label}**](./${item.slug}.md) — ${item.description}`)
  }
  lines.push(``)

  for (const key of ['payment', 'geospatial']) {
    const group = groups[key]
    if (group.items.length === 0) continue
    lines.push(`### ${group.label}`, ``)
    for (const item of group.items) {
      lines.push(
        `- [**${item.label}**](./${item.slug}.md) — ${item.description}`
      )
    }
    lines.push(``)
  }

  for (const key of ['selection', 'content']) {
    const group = groups[key]
    if (group.items.length === 0) continue
    lines.push(`## ${group.label}`, ``)
    for (const item of group.items) {
      lines.push(
        `- [**${item.label}**](./${item.slug}.md) — ${item.description}`
      )
    }
    lines.push(``)
  }

  return lines.join('\n')
}

function generatePagesIndex() {
  const lines = [
    `---`,
    `sidebar_position: 1`,
    `---`,
    ``,
    `# Page Types`,
    ``,
    `Built-in page controllers that define how a page behaves. Set the \`controller\` property on a page definition to use a specific page type.`,
    ``
  ]

  for (const [, meta] of Object.entries(metadata.pages)) {
    const slug = meta.label.toLowerCase().replace(/\s+/g, '-')
    lines.push(`- [**${meta.label}**](./${slug}.md) — ${meta.description}`)
  }

  lines.push(``)
  return lines.join('\n')
}

function main() {
  const componentsDtsPath = path.join(
    formsModelTypesDir,
    'components/types.d.ts'
  )
  const enumsDtsPath = path.join(formsModelTypesDir, 'components/enums.d.ts')

  if (!fs.existsSync(componentsDtsPath)) {
    console.error(
      `Error: cannot find @defra/forms-model types at:\n  ${componentsDtsPath}\nIs the package installed?`
    )
    process.exit(1)
  }

  // Set up output directories
  if (fs.existsSync(componentsOutputDir)) {
    fs.rmSync(componentsOutputDir, { recursive: true, force: true })
  }
  fs.mkdirSync(componentsOutputDir, { recursive: true })

  if (fs.existsSync(pagesOutputDir)) {
    fs.rmSync(pagesOutputDir, { recursive: true, force: true })
  }
  fs.mkdirSync(pagesOutputDir, { recursive: true })

  // Parse sources
  const interfaces = parseComponentInterfaces(componentsDtsPath)
  const componentOrder = parseComponentOrder(enumsDtsPath)
  const parsedCategories = parseCategories(componentsDtsPath)

  // Build full category map
  const categories = {}
  for (const name of componentOrder) {
    categories[name] = deriveCategory(name, parsedCategories)
  }

  // Generate component pages in enum order
  for (const [i, name] of componentOrder.entries()) {
    const interfaceData = interfaces[`${name}Component`] ??
      interfaces[name] ?? {
        options: [],
        schema: [],
        hasContent: false,
        hasList: false
      }

    if (
      !interfaces[`${name}Component`] &&
      !interfaces[name] &&
      categories[name] !== 'content'
    ) {
      console.warn(`Warning: no interface data found for ${name}`)
    }

    const slug = toKebabCase(name)
    const content = generateComponentMd(name, interfaceData, i + 1)
    fs.writeFileSync(path.join(componentsOutputDir, `${slug}.md`), content)
  }

  // Generate components index
  fs.writeFileSync(
    path.join(componentsOutputDir, 'index.md'),
    generateComponentsIndex(componentOrder, categories)
  )

  // Generate page type pages
  for (const key of Object.keys(metadata.pages)) {
    const meta = metadata.pages[key]
    const slug = meta.label.toLowerCase().replace(/\s+/g, '-')
    const content = generatePageMd(key)
    if (content) {
      fs.writeFileSync(path.join(pagesOutputDir, `${slug}.md`), content)
    }
  }

  fs.writeFileSync(path.join(pagesOutputDir, 'index.md'), generatePagesIndex())

  console.log(
    `Generated ${componentOrder.length} component pages and ${Object.keys(metadata.pages).length} page type pages.`
  )
}

main()
