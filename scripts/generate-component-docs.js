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

/**
 * Convert PascalCase to kebab-case.
 * "TextField" -> "text-field", "Html" -> "html"
 */
function toKebabCase(str) {
  return str.replace(
    /([A-Z])/g,
    (match, letter, offset) => (offset > 0 ? '-' : '') + letter.toLowerCase()
  )
}

/**
 * Convert PascalCase to Title Case with spaces.
 * "TextField" -> "Text Field"
 */
function toLabel(name) {
  return name
    .replace(
      /([A-Z])/g,
      (match, letter, offset) => (offset > 0 ? ' ' : '') + letter
    )
    .trim()
}

/**
 * Simplify complex TypeScript type strings for display in docs tables.
 */
function simplifyType(rawType) {
  if (!rawType) return 'unknown'
  const t = rawType.replace(/\s+/g, ' ').trim()
  if (t.startsWith('{') || t.includes('LanguageMessages')) return 'object'
  if (t.includes('ListTypeContent') || t.includes('ListTypeOption'))
    return 'string'
  if (t.endsWith('[]')) return simplifyType(t.slice(0, -2)) + '[]'
  return t
}

/**
 * Extract properties from a TypeLiteralNode.
 */
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
 * Extract component-specific options properties.
 * options type is: BaseOptions & { specific?: type } — we want the & { } part.
 */
function extractOptionsProps(typeNode, sourceFile) {
  if (ts.isIntersectionTypeNode(typeNode)) {
    const lastType = typeNode.types[typeNode.types.length - 1]
    if (ts.isTypeLiteralNode(lastType)) {
      return extractTypeLiteralProps(lastType, sourceFile)
    }
  }
  if (ts.isTypeLiteralNode(typeNode)) {
    return extractTypeLiteralProps(typeNode, sourceFile)
  }
  return []
}

/**
 * Parse all exported interfaces from a .d.ts file.
 * Returns a map of interface name -> { options: [], schema: [] }.
 */
function parseComponentInterfaces(dtsPath) {
  const content = fs.readFileSync(dtsPath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    dtsPath,
    content,
    ts.ScriptTarget.Latest,
    true
  )

  const result = {}

  function visit(node) {
    if (
      ts.isInterfaceDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const name = node.name.text
      const options = []
      const schema = []

      for (const member of node.members) {
        if (!ts.isPropertySignature(member)) continue
        const propName = member.name.getText(sourceFile)

        if (propName === 'options' && member.type) {
          options.push(...extractOptionsProps(member.type, sourceFile))
        }
        if (propName === 'schema' && member.type) {
          schema.push(...extractTypeLiteralProps(member.type, sourceFile))
        }
      }

      if (options.length > 0 || schema.length > 0) {
        result[name] = { options, schema }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return result
}

/**
 * Generate markdown content for a single component page.
 */
function generateComponentMd(componentName, interfaceData) {
  const meta = metadata.components[componentName] || {}
  const description = meta.description || ''
  const example = meta.example || {
    type: componentName,
    name: 'fieldName',
    title: 'Field title',
    options: {}
  }
  const label = meta.label || toLabel(componentName)
  const { options: parsedOptions = [], schema = [] } = interfaceData || {}
  const options = [...parsedOptions, ...(meta.extraOptions ?? [])]

  const lines = [
    `---`,
    `sidebar_label: "${label}"`,
    `sidebar_position: ${meta.sidebarPosition ?? 99}`,
    `---`,
    ``,
    `# ${label}`,
    ``,
    description,
    ``,
    `## JSON definition`,
    ``,
    '```json',
    JSON.stringify(example, null, 2),
    '```',
    ``
  ]

  if (options.length > 0) {
    lines.push(`## Options`, ``)
    lines.push(`| Property | Type | Required | Description |`)
    lines.push(`|----------|------|----------|-------------|`)
    for (const prop of options) {
      const desc = metadata.properties[prop.name] ?? ''
      const required = prop.optional ? 'No' : 'Yes'
      lines.push(
        `| \`${prop.name}\` | \`${prop.type}\` | ${required} | ${desc} |`
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

/**
 * Generate markdown content for a single page controller page.
 */
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

  if (uniqueProperties && uniqueProperties.length > 0) {
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

/**
 * Generate the components index page listing all components by category.
 */
function generateComponentsIndex(componentNames) {
  const categories = {
    input: { label: 'Input fields', items: [] },
    selection: { label: 'Selection fields', items: [] },
    content: { label: 'Content components', items: [] },
    payment: { label: 'Payment', items: [] },
    geospatial: { label: 'Geospatial fields', items: [] }
  }

  for (const name of componentNames) {
    const meta = metadata.components[name]
    if (!meta) continue
    const category = meta.category || 'input'
    const label = meta.label || toLabel(name)
    const slug = toKebabCase(name)
    if (categories[category]) {
      categories[category].items.push({
        label,
        slug,
        description: meta.description
      })
    }
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

  for (const [, cat] of Object.entries(categories)) {
    if (cat.items.length === 0) continue
    lines.push(`## ${cat.label}`, ``)
    for (const item of cat.items) {
      lines.push(
        `- [**${item.label}**](./${item.slug}.md) — ${item.description}`
      )
    }
    lines.push(``)
  }

  return lines.join('\n')
}

/**
 * Generate the pages index page listing all page types.
 */
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
  // Set up output directories
  if (fs.existsSync(componentsOutputDir)) {
    fs.rmSync(componentsOutputDir, { recursive: true, force: true })
  }
  fs.mkdirSync(componentsOutputDir, { recursive: true })

  if (fs.existsSync(pagesOutputDir)) {
    fs.rmSync(pagesOutputDir, { recursive: true, force: true })
  }
  fs.mkdirSync(pagesOutputDir, { recursive: true })

  // Parse component interfaces
  const componentDtsPath = path.join(
    formsModelTypesDir,
    'components/types.d.ts'
  )
  if (!fs.existsSync(componentDtsPath)) {
    console.error(
      `Error: cannot find @defra/forms-model types at:\n  ${componentDtsPath}\nIs the package installed?`
    )
    process.exit(1)
  }
  const interfaces = parseComponentInterfaces(componentDtsPath)

  // Generate component pages
  const componentNames = Object.keys(metadata.components)
  for (const name of componentNames) {
    const slug = toKebabCase(name)
    // Interface names in types.d.ts use a "Component" suffix (e.g. TextFieldComponent)
    const interfaceData = interfaces[`${name}Component`] ?? interfaces[name]
    const meta = metadata.components[name]
    if (!interfaceData && meta?.category !== 'content') {
      console.warn(
        `Warning: no interface data found for ${name} (tried ${name}Component and ${name})`
      )
    }
    const content = generateComponentMd(name, interfaceData)
    fs.writeFileSync(path.join(componentsOutputDir, `${slug}.md`), content)
  }

  // Generate components index
  fs.writeFileSync(
    path.join(componentsOutputDir, 'index.md'),
    generateComponentsIndex(componentNames)
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

  // Generate pages index
  fs.writeFileSync(path.join(pagesOutputDir, 'index.md'), generatePagesIndex())

  const componentCount = componentNames.length
  const pageCount = Object.keys(metadata.pages).length
  console.log(
    `Generated ${componentCount} component pages and ${pageCount} page type pages.`
  )
}

main()
