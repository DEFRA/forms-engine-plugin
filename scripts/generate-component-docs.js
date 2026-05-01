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

// Known acronyms for label generation
const ACRONYMS = { Uk: 'UK', Os: 'OS', Html: 'HTML' }

export function toKebabCase(str) {
  return str.replace(
    /([A-Z])/g,
    (match, letter, offset) => (offset > 0 ? '-' : '') + letter.toLowerCase()
  )
}

export function toLabel(name) {
  const words = name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
  return words.map((w) => ACRONYMS[w] ?? w).join(' ')
}

export function simplifyType(rawType) {
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

    // Also check inherited members — e.g. `list` lives on ListFieldBase, not on the
    // concrete exported interface that extends it.
    if (!hasContent || !hasList) {
      for (const clause of node.heritageClauses ?? []) {
        for (const type of clause.types) {
          const baseName = type.expression.getText(sourceFile)
          const baseIface = allInterfaces[baseName]
          if (!baseIface) continue
          for (const member of baseIface.members) {
            if (!ts.isPropertySignature(member)) continue
            const propName = member.name.getText(sourceFile)
            if (propName === 'content') hasContent = true
            if (propName === 'list') hasList = true
          }
        }
      }
    }

    // Props typed as `undefined` are explicitly excluded for this component (e.g.
    // `required?: undefined` on ContentFieldBase). Sort alphabetically for stable output.
    const options = rawOptions
      .filter((p) => p.type !== 'undefined')
      .sort((a, b) => a.name.localeCompare(b.name))

    result[name] = { options, schema, hasContent, hasList }
  })

  return result
}

/**
 * Recursively flatten an interface into dotted-path prop descriptors.
 * Resolves type references to other interfaces rather than leaving them as opaque types.
 * @param {import('typescript').InterfaceDeclaration} iface
 * @param {Record<string, import('typescript').InterfaceDeclaration>} allInterfaces
 * @param {import('typescript').SourceFile} sourceFile
 * @param {string} prefix - Dotted prefix accumulated so far
 * @param {number} [depth]
 * @returns {Array<{name: string, type: string, optional: boolean}>}
 */
function flattenInterface(iface, allInterfaces, sourceFile, prefix, depth = 0) {
  if (depth > 4) return []
  const props = []

  for (const member of iface.members) {
    if (!ts.isPropertySignature(member)) continue
    const propName = member.name.getText(sourceFile)
    const optional = !!member.questionToken
    const fullName = `${prefix}.${propName}`

    if (member.type && ts.isTypeReferenceNode(member.type)) {
      const refName = member.type.typeName.getText(sourceFile)
      if (allInterfaces[refName]) {
        props.push(
          ...flattenInterface(
            allInterfaces[refName],
            allInterfaces,
            sourceFile,
            fullName,
            depth + 1
          )
        )
        continue
      }
    }

    const rawType = member.type ? member.type.getText(sourceFile) : 'unknown'
    props.push({ name: fullName, type: simplifyType(rawType), optional })
  }

  return props
}

/**
 * Derive the controller → interface map and per-controller example path hints from types.
 * Reads ControllerType and ControllerPath enums plus the PageX interfaces in one pass.
 * @param {string} formDefinitionDtsPath
 * @param {string} pagesEnumsDtsPath
 * @returns {{ controllerMap: Record<string, string>, pathHints: Record<string, string> }}
 */
function parseControllerMap(formDefinitionDtsPath, pagesEnumsDtsPath) {
  // Collect both ControllerType and ControllerPath enum variant → string value maps
  const enumContent = fs.readFileSync(pagesEnumsDtsPath, 'utf-8')
  const enumSourceFile = ts.createSourceFile(
    pagesEnumsDtsPath,
    enumContent,
    ts.ScriptTarget.Latest,
    true
  )

  const controllerTypeValues = {}
  const controllerPathValues = {}
  ts.forEachChild(enumSourceFile, (node) => {
    if (!ts.isEnumDeclaration(node)) return
    const isType = node.name.text === 'ControllerType'
    const isPath = node.name.text === 'ControllerPath'
    if (!isType && !isPath) return
    for (const member of node.members) {
      if (!ts.isEnumMember(member) || !member.initializer) continue
      const variant = member.name.getText(enumSourceFile)
      const value = member.initializer
        .getText(enumSourceFile)
        .replace(/['"]/g, '')
      if (isType) controllerTypeValues[variant] = value
      else controllerPathValues[variant] = value
    }
  })

  // For each PageX interface, derive the controller key (from `controller` type) and
  // the canonical example path (from `path` type when it starts with ControllerPath.X)
  const defContent = fs.readFileSync(formDefinitionDtsPath, 'utf-8')
  const defSourceFile = ts.createSourceFile(
    formDefinitionDtsPath,
    defContent,
    ts.ScriptTarget.Latest,
    true
  )

  const controllerMap = {}
  const pathHints = {}
  ts.forEachChild(defSourceFile, (node) => {
    if (!ts.isInterfaceDeclaration(node)) return
    const interfaceName = node.name.text
    let controllerKey = null
    let pathHint = null
    for (const member of node.members) {
      if (!ts.isPropertySignature(member) || !member.type) continue
      const propName = member.name.getText(defSourceFile)
      const rawType = member.type.getText(defSourceFile)
      if (propName === 'controller') {
        const m = rawType.match(/^ControllerType\.(\w+)$/)
        if (m) controllerKey = controllerTypeValues[m[1]] ?? null
      }
      if (propName === 'path') {
        const m = rawType.match(/^ControllerPath\.(\w+)/)
        if (m) pathHint = controllerPathValues[m[1]] ?? null
      }
    }
    if (controllerKey) {
      controllerMap[controllerKey] = interfaceName
      if (pathHint) pathHints[controllerKey] = pathHint
    }
  })

  return { controllerMap, pathHints }
}

/**
 * Parse page interfaces from form-definition types.d.ts.
 * Returns a map: controllerKey -> { props, examplePath }.
 * @param {string} dtsPath
 * @param {Record<string, string>} controllerMap
 * @param {Record<string, string>} pathHints
 * @returns {Record<string, { props: Array<{name: string, type: string, optional: boolean}>, examplePath: string }>}
 */
function parsePageInterfaces(dtsPath, controllerMap, pathHints) {
  const content = fs.readFileSync(dtsPath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    dtsPath,
    content,
    ts.ScriptTarget.Latest,
    true
  )

  const allInterfaces = {}
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      allInterfaces[node.name.text] = node
    }
  })

  // Collect PageBase members once — merged into every page type below
  const pageBaseProps = []
  const pageBaseIface = allInterfaces['PageBase']
  if (pageBaseIface) {
    for (const member of pageBaseIface.members) {
      if (!ts.isPropertySignature(member)) continue
      const propName = member.name.getText(sourceFile)
      const optional = !!member.questionToken
      const rawType = member.type ? member.type.getText(sourceFile) : 'unknown'
      pageBaseProps.push({
        name: propName,
        type: simplifyType(rawType),
        optional
      })
    }
  }

  const result = {}

  for (const [controllerKey, interfaceName] of Object.entries(controllerMap)) {
    const iface = allInterfaces[interfaceName]
    if (!iface) {
      result[controllerKey] = {
        props: [],
        examplePath: pathHints[controllerKey] ?? '/page-path'
      }
      continue
    }

    const props = []

    for (const member of iface.members) {
      if (!ts.isPropertySignature(member)) continue
      const propName = member.name.getText(sourceFile)
      const optional = !!member.questionToken

      if (member.type && ts.isTypeReferenceNode(member.type)) {
        const refName = member.type.typeName.getText(sourceFile)
        if (allInterfaces[refName]) {
          props.push(
            ...flattenInterface(
              allInterfaces[refName],
              allInterfaces,
              sourceFile,
              propName,
              0
            )
          )
          continue
        }
      }

      const rawType = member.type ? member.type.getText(sourceFile) : 'unknown'
      props.push({
        name: propName,
        type: simplifyType(rawType),
        optional
      })
    }

    // Merge PageBase props for any name not already declared on this page type
    const seenNames = new Set(props.map((p) => p.name))
    for (const p of pageBaseProps) {
      if (!seenNames.has(p.name)) props.push(p)
    }

    // Props typed as `undefined` are explicitly excluded for this page type
    // (e.g. `section?: undefined` on PageSummary). Sort alphabetically.
    result[controllerKey] = {
      props: props
        .filter((p) => p.type !== 'undefined')
        .sort((a, b) => a.name.localeCompare(b.name)),
      examplePath: pathHints[controllerKey] ?? '/page-path'
    }
  }

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

export function deriveCategory(name, parsedCategories) {
  return parsedCategories[name] ?? 'input'
}

/**
 * Return a placeholder value for a given type string.
 * Used to populate required fields in generated examples.
 */
export function placeholderForType(type) {
  if (type === 'number') return 0
  if (type === 'boolean') return true
  if (type === 'string') return ''
  if (type.endsWith('[]')) return []
  return {}
}

/**
 * Generate an example JSON for a component based on its structure.
 * Required options/schema fields are shown with placeholder values.
 * Optional fields are omitted — the tables below the example document them.
 */
export function generateExample(componentName, interfaceData) {
  const { options = [], schema = [], hasContent, hasList } = interfaceData

  const example = {
    type: componentName,
    name: 'fieldName',
    title: 'Question title'
  }

  if (hasContent) example.content = ''
  if (hasList) example.list = 'listName'

  const requiredOptions = options.filter((p) => !p.optional)
  if (requiredOptions.length > 0) {
    example.options = Object.fromEntries(
      requiredOptions.map((p) => [p.name, placeholderForType(p.type)])
    )
  } else if (options.length > 0) {
    example.options = {}
  }

  const requiredSchema = schema.filter((p) => !p.optional)
  if (requiredSchema.length > 0) {
    example.schema = Object.fromEntries(
      requiredSchema.map((p) => [p.name, placeholderForType(p.type)])
    )
  } else if (schema.length > 0) {
    example.schema = {}
  }

  return example
}

function generateComponentMd(componentName, interfaceData, sidebarPosition) {
  const description = metadata.components[componentName] ?? ''
  const label = toLabel(componentName)
  const { options = [], schema = [] } = interfaceData

  const links = metadata.componentLinks?.[componentName] ?? []

  const lines = [
    `---`,
    `sidebar_label: "${label}"`,
    `sidebar_position: ${sidebarPosition}`,
    `---`,
    ``,
    `# ${label}`,
    ``,
    description,
    ``
  ]

  for (const text of links) {
    lines.push(text, ``)
  }

  lines.push(
    `## JSON definition`,
    ``,
    '```json',
    JSON.stringify(generateExample(componentName, interfaceData), null, 2),
    '```',
    ``
  )

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

/**
 * Set a value at a dotted path within an object, creating nested objects as needed.
 * @param {Record<string, unknown>} obj
 * @param {string} dotPath
 * @param {unknown} value
 */
export function setNestedValue(obj, dotPath, value) {
  const parts = dotPath.split('.')
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (!current[key] || typeof current[key] !== 'object') current[key] = {}
    current = /** @type {Record<string, unknown>} */ (current[key])
  }
  current[parts[parts.length - 1]] = value
}

/**
 * Derive the human-readable label for a controller key by stripping the
 * "Controller" suffix and formatting the remaining words.
 * e.g. "RepeatPageController" -> "Repeat Page"
 * @param {string} controllerKey
 * @returns {string}
 */
export function controllerLabel(controllerKey) {
  return toLabel(controllerKey.replace(/Controller$/, ''))
}

/**
 * Derive the kebab-case slug for a controller key.
 * e.g. "RepeatPageController" -> "repeat-page"
 * @param {string} controllerKey
 * @returns {string}
 */
export function controllerSlug(controllerKey) {
  return toKebabCase(controllerKey.replace(/Controller$/, ''))
}

/**
 * Generate a JSON example for a page type from its parsed unique properties.
 * @param {string} controllerKey
 * @param {Array<{name: string, type: string, optional: boolean}>} uniqueProps
 * @param {string} [examplePath]
 * @returns {Record<string, unknown>}
 */
export function generatePageExample(
  controllerKey,
  uniqueProps,
  examplePath = '/page-path'
) {
  const controllerValue =
    controllerKey === 'PageController' ? null : controllerKey
  const path = examplePath

  const example = /** @type {Record<string, unknown>} */ ({ path })
  if (controllerValue) example.controller = controllerValue
  example.title = 'Page title'

  // Skip props already set explicitly above so placeholders don't overwrite them
  const hardcoded = new Set(['path', 'title', 'controller'])
  for (const prop of uniqueProps.filter(
    (p) => !p.optional && !hardcoded.has(p.name)
  )) {
    setNestedValue(example, prop.name, placeholderForType(prop.type))
  }

  // Give next a meaningful routing example rather than the empty array placeholder
  if (uniqueProps.some((p) => p.name === 'next' && !p.optional)) {
    example.next = [{ path: '/next-page' }]
  }

  return example
}

/**
 * @param {string} controllerKey
 * @param {Array<{name: string, type: string, optional: boolean}>} uniqueProps
 * @param {string} examplePath
 * @param {number} sidebarPosition
 */
function generatePageMd(
  controllerKey,
  uniqueProps,
  examplePath,
  sidebarPosition
) {
  const description = metadata.pages[controllerKey]
  if (!description) return null

  const label = controllerLabel(controllerKey)
  const isDefault = controllerKey === 'PageController'
  const links = metadata.pageLinks?.[controllerKey] ?? []

  const lines = [
    `---`,
    `sidebar_label: "${label}"`,
    `sidebar_position: ${sidebarPosition}`,
    `---`,
    ``,
    `# ${label}`,
    ``,
    description,
    ``
  ]

  for (const text of links) {
    lines.push(text, ``)
  }

  if (isDefault) {
    lines.push(
      `**Controller value:** omit the \`controller\` property, or use \`"PageController"\``,
      ``
    )
  } else {
    lines.push(`**Controller value:** \`"${controllerKey}"\``, ``)
  }

  lines.push(
    `## JSON definition`,
    ``,
    '```json',
    JSON.stringify(
      generatePageExample(controllerKey, uniqueProps, examplePath),
      null,
      2
    ),
    '```',
    ``
  )

  if (uniqueProps.length > 0) {
    lines.push(`## Configuration`, ``)
    lines.push(`| Property | Type | Required | Description |`)
    lines.push(`|----------|------|----------|-------------|`)
    for (const prop of uniqueProps) {
      const desc = metadata.pageProperties?.[prop.name] ?? ''
      lines.push(
        `| \`${prop.name}\` | \`${prop.type}\` | ${prop.optional ? 'No' : 'Yes'} | ${desc} |`
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
    content: { label: 'Content components', items: [] }
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

  for (const [key, description] of Object.entries(metadata.pages)) {
    const label = controllerLabel(key)
    const slug = controllerSlug(key)
    lines.push(`- [**${label}**](./${slug}.md) — ${description}`)
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
  const formDefinitionDtsPath = path.join(
    formsModelTypesDir,
    'form/form-definition/types.d.ts'
  )
  const pagesEnumsDtsPath = path.join(formsModelTypesDir, 'pages/enums.d.ts')

  if (!fs.existsSync(componentsDtsPath)) {
    console.error(
      `Error: cannot find @defra/forms-model types at:\n  ${componentsDtsPath}\nIs the package installed?`
    )
    process.exit(1)
  }

  if (!fs.existsSync(enumsDtsPath)) {
    console.error(
      `Error: cannot find @defra/forms-model enums at:\n  ${enumsDtsPath}\nIs the package installed?`
    )
    process.exit(1)
  }

  if (!fs.existsSync(formDefinitionDtsPath)) {
    console.error(
      `Error: cannot find @defra/forms-model form-definition types at:\n  ${formDefinitionDtsPath}\nIs the package installed?`
    )
    process.exit(1)
  }

  if (!fs.existsSync(pagesEnumsDtsPath)) {
    console.error(
      `Error: cannot find @defra/forms-model pages enums at:\n  ${pagesEnumsDtsPath}\nIs the package installed?`
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
  const { controllerMap, pathHints } = parseControllerMap(
    formDefinitionDtsPath,
    pagesEnumsDtsPath
  )
  const pageInterfaces = parsePageInterfaces(
    formDefinitionDtsPath,
    controllerMap,
    pathHints
  )

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
  for (const [i, key] of Object.keys(metadata.pages).entries()) {
    const slug = controllerSlug(key)
    if (pageInterfaces[key] === undefined) {
      console.warn(
        `Warning: no interface data found for page type ${key} — is it in the ControllerType enum?`
      )
    }
    const { props: uniqueProps = [], examplePath = '/page-path' } =
      pageInterfaces[key] ?? {}
    const content = generatePageMd(key, uniqueProps, examplePath, i + 1)
    if (content) {
      fs.writeFileSync(path.join(pagesOutputDir, `${slug}.md`), content)
    }
  }

  fs.writeFileSync(path.join(pagesOutputDir, 'index.md'), generatePagesIndex())

  console.log(
    `Generated ${componentOrder.length} component pages and ${Object.keys(metadata.pages).length} page type pages.`
  )
}

// Only run when executed directly, not when imported as a module
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
