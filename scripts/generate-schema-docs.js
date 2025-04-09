import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const schemasDir = path.resolve(
  __dirname,
  '../node_modules/@defra/forms-model/schemas'
)
export const docsOutputDir = path.resolve(__dirname, '../docs/schemas')

/**
 * @typedef {{
 *   title?: string,
 *   $id?: string,
 *   oneOf?: JsonSchema[],
 *   anyOf?: JsonSchema[],
 *   allOf?: JsonSchema[],
 *   properties?: {[key: string]: JsonSchema},
 *   items?: JsonSchema|JsonSchema[],
 *   [key: string]: any
 * }} JsonSchema
 */

/**
 * Setup directories for documentation generation
 * @returns {string} Path to temporary directory
 */
export function setupDirectories() {
  if (fs.existsSync(docsOutputDir)) {
    fs.rmSync(docsOutputDir, { recursive: true, force: true })
  }
  fs.mkdirSync(docsOutputDir, { recursive: true })

  const tempDir = path.resolve(__dirname, '../temp-schemas')
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
  fs.mkdirSync(tempDir, { recursive: true })

  return tempDir
}

/**
 * Get all schema files from the package
 * @returns {string[]} List of schema files
 */
export function getSchemaFiles() {
  return fs
    .readdirSync(schemasDir)
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Process schema content by adding ID if missing and building title map
 * @param {JsonSchema} schema - Schema content to process
 * @param {string} filename - Original filename
 * @param {Record<string, string>} schemaTitleMap - Map of schema paths to titles
 * @returns {JsonSchema} Processed schema
 */
export function processSchemaContent(schema, filename, schemaTitleMap) {
  if (!schema.$id) {
    schema.$id = `@defra/forms-model/schemas/${filename}`
  }

  buildTitleMap(schema, filename.replace('.json', ''), schemaTitleMap)
  return schema
}

/**
 * Reads and processes a schema file
 * @param {string} filePath - Path to schema file
 * @returns {JsonSchema|null} - Parsed schema or null if file doesn't exist
 */
export function readSchemaFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Schema file not found: ${filePath}`)
    return null
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

/**
 * Process a single schema file
 * @param {string} file - JSON schema filename to process
 * @param {string} tempDir - Path to temporary directory for processed schemas
 * @param {Record<string, string>} schemaTitleMap - Map of schema paths to titles
 */
export function processSchemaFile(file, tempDir, schemaTitleMap) {
  const schemaPath = path.join(schemasDir, file)
  const schema = readSchemaFile(schemaPath)

  if (!schema) {
    return
  }

  const processedSchema = processSchemaContent(schema, file, schemaTitleMap)
  const newFilename = file.replace('.json', '.schema.json')

  fs.writeFileSync(
    path.join(tempDir, newFilename),
    JSON.stringify(processedSchema, null, 2)
  )
}

/**
 * Run the jsonschema2md tool
 * @param {string} tempDir - Path to temporary directory with schema files
 */
export function runJsonSchema2Md(tempDir) {
  console.log('🛠️ Running jsonschema2md and processing markdown...')

  if (!tempDir || typeof tempDir !== 'string') {
    throw new Error('Invalid temporary directory path provided')
  }

  tempDir = path.normalize(tempDir)

  const dangerousChars = /[;&|`$(){}[\]*?<>]/
  if (dangerousChars.test(tempDir) || dangerousChars.test(docsOutputDir)) {
    throw new Error('Directory path contains potentially unsafe characters')
  }

  const absoluteTempDir = path.resolve(tempDir)
  const projectRoot = path.resolve(__dirname, '..')
  if (!absoluteTempDir.startsWith(projectRoot)) {
    throw new Error('Temporary directory must be within the project')
  }

  const tempDirArg = `"${tempDir.replace(/"/g, '\\"')}"`
  const docsOutputDirArg = `"${docsOutputDir.replace(/"/g, '\\"')}"`

  execSync(
    `npx --yes @adobe/jsonschema2md -d ${tempDirArg} -o ${docsOutputDirArg} --schema-extension schema.json -h false`,
    { stdio: ['inherit', 'ignore', 'inherit'] }
  )
}

/**
 * Create index and README files listing all schemas
 * @param {string[]} schemaFiles - List of schema files
 */
export function createIndexFile(schemaFiles) {
  const coreSchemas = [
    'component-schema-v2',
    'component-schema',
    'form-definition-schema',
    'form-definition-v2-payload-schema',
    'form-metadata-schema',
    'page-schema',
    'page-schema-v2',
    'list-schema',
    'list-schema-v2'
  ]

  const advancedSchemas = [
    'form-metadata-author-schema',
    'form-metadata-input-schema',
    'form-metadata-state-schema',
    'form-metadata-contact-schema',
    'form-metadata-email-schema',
    'form-metadata-online-schema',
    'page-schema-payload-v2',
    'question-schema'
  ]

  const core = /** @type {string[]} */ ([])
  const advanced = /** @type {string[]} */ ([])

  schemaFiles.forEach((file) => {
    const baseName = path.basename(file, '.json')
    const link = `* [${baseName}](${baseName}.md)`

    if (coreSchemas.includes(baseName)) {
      core.push(link)
    } else if (advancedSchemas.includes(baseName)) {
      advanced.push(link)
    } else {
      console.log(
        `Note: Schema '${baseName}' is not categorised as core or advanced`
      )
    }
  })

  core.sort((a, b) => a.localeCompare(b))
  advanced.sort((a, b) => a.localeCompare(b))

  const content = `---
layout: default
title: Schema Reference
nav_order: 5
has_children: true
permalink: /schemas/
nav_exclude: true
toc: false
---

# Defra Forms Model Schema Reference

This reference documentation details the data structures and validation rules for the Defra Forms Model.

> **Note:** This documentation is automatically generated from the JSON Schema files.

## Overview

The schemas in this directory define the data models used throughout the DXT forms engine. They provide validation rules, type definitions, and structural constraints that ensure form data is consistent and valid.

Key schema categories include:
- Form definitions (structure of form configurations)
- Component schemas (input fields, buttons, etc.)
- Metadata schemas (form properties, versioning)

## Core Schemas

The following schemas are the most commonly used for form configuration:

${core.join('\n')}

## Advanced Schemas

These schemas are primarily for internal use or advanced customisation:

${advanced.join('\n')}
`

  fs.writeFileSync(path.join(docsOutputDir, 'index.md'), content)

  console.log(
    '📝 Created README.md and index.md files with precisely categorised schemas'
  )
}

/**
 * Clean up temporary files
 * @param {string} tempDir - Path to temporary directory
 */
export function cleanupFiles(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true })

  if (fs.existsSync(path.resolve(process.cwd(), 'out'))) {
    fs.rmSync(path.resolve(process.cwd(), 'out'), {
      recursive: true,
      force: true
    })
  }

  const docgenFiles = fs
    .readdirSync(docsOutputDir)
    .filter((file) => file.includes('-docgeneration'))

  for (const file of docgenFiles) {
    fs.unlinkSync(path.join(docsOutputDir, file))
  }
}

/**
 * Process standard markdown files
 * @param {string} docsDir - Directory containing markdown files
 * @param {Record<string, string>} titleMap - Map of schema paths to titles
 */
export function processStandardMarkdownFiles(docsDir, titleMap) {
  const mdFiles = fs
    .readdirSync(docsDir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')

  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file)
    let content = fs.readFileSync(filePath, 'utf8')
    const schemaBase = file.replace('.md', '')

    // Fix numeric type headings (e.g., "## 0 Type" -> "## Component Type")
    content = content.replace(/## (\d+) Type/g, (_match, index) => {
      const pathToCheck = `${schemaBase}/oneOf/${index}`
      const title =
        titleMap[pathToCheck] ||
        titleMap[`${schemaBase}/anyOf/${index}`] ||
        titleMap[`${schemaBase}/allOf/${index}`] ||
        `Item ${index}`

      return `## ${title} Type`
    })

    // Fix numeric properties headings
    content = content.replace(/# (\d+) Properties/g, (_match, index) => {
      const pathToCheck = `${schemaBase}/oneOf/${index}`
      const title =
        titleMap[pathToCheck] ||
        titleMap[`${schemaBase}/anyOf/${index}`] ||
        titleMap[`${schemaBase}/allOf/${index}`] ||
        `Item ${index}`

      return `# ${title} Properties`
    })

    // Fix definitions headings
    content = content.replace(/## ([\w-]+) Type/g, (_match, defName) => {
      const title =
        titleMap[`${schemaBase}/definitions/${defName}`] ??
        formatPropertyName(String(defName))

      return `## ${title} Type`
    })

    // Fix redundant Type Type headings (property named "type" with title "Type")
    content = content.replace(/## Type Type/g, '## Type')

    // Fix other redundant headings (when property name and title are identical)
    content = content.replace(/## (\w+) \1\b/gi, (_match, word) => {
      return `## ${word}`
    })

    fs.writeFileSync(filePath, content)
  }
}

/**
 * Process all schema files
 * @param {string[]} schemaFiles - List of schema files to process
 * @param {string} tempDir - Path to temporary directory
 * @param {Record<string, string>} schemaTitleMap - Map to store titles
 */
export function processSchemaFiles(schemaFiles, tempDir, schemaTitleMap) {
  for (const file of schemaFiles) {
    processSchemaFile(file, tempDir, schemaTitleMap)
  }
}

/**
 * Generate markdown documentation from processed schemas
 * @param {string} tempDir - Path to temporary directory with schema files
 * @param {Record<string, string>} titleMap - Map of schema paths to titles
 * @param {string[]} schemaFiles - List of original schema files
 */
export function generateMarkdownDocumentation(tempDir, titleMap, schemaFiles) {
  runJsonSchema2Md(tempDir)
  fixMarkdownHeadings(docsOutputDir, titleMap)
  createIndexFile(schemaFiles)
}

/**
 * Applies regex-based replacements to content
 * @param {string} content - Content to modify
 * @param {Array<{pattern: RegExp, replacement: string|((match: string, ...args: any[]) => string)}>} replacements
 * @returns {string} Modified content
 */
export function applyReplacements(content, replacements) {
  return replacements.reduce((result, { pattern, replacement }) => {
    if (typeof replacement === 'string') {
      return result.replace(pattern, replacement)
    }

    return result.replace(pattern, replacement)
  }, content)
}

/**
 * Fix specific markdown headings in a condition file
 * @param {string} content - File content
 * @param {string} filename - Name of the file
 * @returns {string} Updated content
 */
export function fixConditionFileHeadings(content, filename) {
  const replacements = []

  // Handle specific condition file types first
  if (filename.includes('static-value')) {
    replacements.push(
      { pattern: /## Item 0 Type/g, replacement: '## Static Value Type' },
      {
        pattern: /# Item 0 Properties/g,
        replacement: '# Static Value Properties'
      }
    )
  }

  if (filename.includes('condition-definition')) {
    replacements.push(
      {
        pattern: /## Item 0 Type/g,
        replacement: '## Condition Definition Type'
      },
      {
        pattern: /# Item 0 Properties/g,
        replacement: '# Condition Definition Properties'
      }
    )
  }

  if (filename.includes('condition-reference')) {
    replacements.push(
      {
        pattern: /## Item 1 Type/g,
        replacement: '## Condition Reference Type'
      },
      {
        pattern: /# Item 1 Properties/g,
        replacement: '# Condition Reference Properties'
      }
    )
  }

  // If no specific patterns were added, use generic replacements
  if (replacements.length === 0) {
    replacements.push(
      { pattern: /## Item 0 Type/g, replacement: '## Condition Item Type' },
      {
        pattern: /# Item 0 Properties/g,
        replacement: '# Condition Item Properties'
      },
      {
        pattern: /## Item 1 Type/g,
        replacement: '## Secondary Condition Type'
      },
      {
        pattern: /# Item 1 Properties/g,
        replacement: '# Secondary Condition Properties'
      }
    )
  }

  return applyReplacements(content, replacements)
}

/**
 * Process condition-specific markdown files
 * @param {string} docsDir - Directory containing markdown files
 */
export function processConditionMarkdownFiles(docsDir) {
  const conditionFiles = fs
    .readdirSync(docsDir)
    .filter(
      (file) =>
        file.endsWith('.md') &&
        file !== 'README.md' &&
        (file.includes('condition') || file.includes('conditions'))
    )

  for (const file of conditionFiles) {
    const filePath = path.join(docsDir, file)
    let content = fs.readFileSync(filePath, 'utf8')

    content = fixConditionFileHeadings(content, file)

    const commonReplacements = [
      {
        pattern: /## Item 2 Type\s+unknown \(\[Nested Condition Group\]/g,
        replacement:
          '## Nested Condition Group Type\n\n' +
          '> **Note:** This represents a recursive structure that can contain additional conditions. ' +
          'Condition groups can be nested to any depth, allowing for complex logical expressions.\n\n' +
          'reference to [Nested Condition Group]'
      },
      {
        pattern: /## Item 2 Type\s+unknown \(\[Conditions.*?Item Variant 3\]/g,
        replacement:
          '## Nested Condition Group Type\n\n' +
          '> **Note:** This represents a recursive structure that can contain additional conditions. ' +
          'Condition groups can be nested to any depth, allowing for complex logical expressions.\n\n' +
          'reference to [Nested Condition Group]'
      }
    ]

    if (file.includes('conditions-item')) {
      commonReplacements.push({
        pattern: /## Items Type\s+merged type \(\[Conditions Item\]/g,
        replacement:
          '## Condition Items Type\n\n' +
          '> Represents the items in a condition group. Can be one of three types: ' +
          'direct conditions, references to named conditions, or nested condition groups.\n\n' +
          'merged type ([Condition Items]'
      })
    }

    content = applyReplacements(content, commonReplacements)
    fs.writeFileSync(filePath, content)
  }
}

/**
 * Fixes numeric headings in generated markdown files
 * @param {string} docsDir - Directory containing generated markdown files
 * @param {Record<string, string>} titleMap - Map of schema paths to titles
 */
export function fixMarkdownHeadings(docsDir, titleMap) {
  processStandardMarkdownFiles(docsDir, titleMap)
  processConditionMarkdownFiles(docsDir)
}

/**
 * Recursively builds a map of schema paths to titles for post-processing
 * @param {JsonSchema} schema - The JSON schema to process
 * @param {string} basePath - Base path for the current schema
 * @param {Record<string, string>} titleMap - Map to store titles by path
 */
export function buildTitleMap(schema, basePath, titleMap) {
  if (schema.title) {
    titleMap[basePath] = schema.title
  }

  ;['oneOf', 'anyOf', 'allOf'].forEach((keyword) => {
    if (schema[keyword] && Array.isArray(schema[keyword])) {
      schema[keyword].forEach((subSchema, index) => {
        const indexPath = `${basePath}/${keyword}/${index}`
        titleMap[indexPath] = subSchema.title ?? `Item ${index + 1}`
        buildTitleMap(subSchema, indexPath, titleMap)
      })
    }
  })

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
      const propPath = `${basePath}/properties/${propName}`
      titleMap[propPath] = propSchema.title ?? formatPropertyName(propName)
      buildTitleMap(/** @type {JsonSchema} */ (propSchema), propPath, titleMap)
    })
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((item, index) => {
        const itemPath = `${basePath}/items/${index}`
        titleMap[itemPath] = item.title ?? `Item ${index + 1}`
        buildTitleMap(/** @type {JsonSchema} */ (item), itemPath, titleMap)
      })
    } else {
      const itemPath = `${basePath}/items`
      titleMap[itemPath] = schema.items.title ?? 'Item'
      buildTitleMap(
        /** @type {JsonSchema} */ (schema.items),
        itemPath,
        titleMap
      )
    }
  }
}

/**
 * Formats a property name for better readability
 * @param {string} str - The property name to format
 * @returns {string} The formatted property name
 */
export function formatPropertyName(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (first) => first.toUpperCase())
    .trim()
}

/**
 * Process markdown files to add front matter
 */
export function addFrontMatterToSchemaFiles() {
  const mdFiles = fs
    .readdirSync(docsOutputDir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')

  for (const file of mdFiles) {
    const filePath = path.join(docsOutputDir, file)
    const content = fs.readFileSync(filePath, 'utf8')

    // Skip if already has front matter
    if (content.startsWith('---')) {
      continue
    }

    // Generate title from filename
    const title = file
      .replace('.md', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())

    // Add front matter
    const frontMatter = `---
layout: default
title: ${title}
parent: Schema Reference
toc: false
---

`
    fs.writeFileSync(filePath, frontMatter + content)
  }
}

/**
 * Generates documentation from JSON schemas
 * @returns {boolean} True if documentation was successfully generated
 */
export function generateSchemaDocs() {
  try {
    console.log('🔄 Generating schema documentation...')

    const tempDir = setupDirectories()
    const schemaFiles = getSchemaFiles()
    console.log(`📋 Found ${schemaFiles.length} schema files to process`)

    const schemaTitleMap = /** @type {Record<string, string>} */ ({})
    processSchemaFiles(schemaFiles, tempDir, schemaTitleMap)

    generateMarkdownDocumentation(tempDir, schemaTitleMap, schemaFiles)
    addFrontMatterToSchemaFiles()

    cleanupFiles(tempDir)

    console.log(`✅ Documentation successfully generated at: ${docsOutputDir}`)
    return true
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error generating documentation:', error.message)
      if (error.stack) {
        console.error(error.stack)
      }
    } else {
      console.error('❌ Error generating documentation:', error)
    }
    throw error
  }
}

// Only run when executed directly, not when imported as a module
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSchemaDocs()
}
