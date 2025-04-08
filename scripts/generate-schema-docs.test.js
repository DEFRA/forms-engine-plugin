// @ts-nocheck
import { jest } from '@jest/globals'
import * as fs from 'fs'
import path from 'path'

jest.mock('../node_modules/@defra/forms-model/schemas', () => ({}), {
  virtual: true
})

import {
  setupDirectories,
  getSchemaFiles,
  processSchemaContent,
  readSchemaFile,
  processSchemaFile,
  runJsonSchema2Md,
  createIndexFile,
  cleanupFiles,
  processStandardMarkdownFiles,
  applyReplacements,
  fixConditionFileHeadings,
  processConditionMarkdownFiles,
  fixMarkdownHeadings,
  buildTitleMap,
  formatPropertyName,
  generateSchemaDocs,
  addFrontMatterToSchemaFiles
} from './generate-schema-docs.js'

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn()
}))

jest.mock('child_process', () => ({
  execSync: jest.fn()
}))

jest.mock('process', () => ({
  cwd: jest.fn(() => '/mock/cwd'),
  argv: ['/node', '/mock/script.js']
}))

jest.mock('path', () => {
  return {
    dirname: jest.fn((p) => String(p).split('/').slice(0, -1).join('/')),
    normalize: jest.fn((p) => String(p).replace(/\/+/g, '/')),
    resolve: jest.fn().mockImplementation((...args) => {
      if (
        args.some((arg) =>
          String(arg).includes('node_modules/@defra/forms-model/schemas')
        )
      ) {
        return '/mock/schemas/dir'
      } else if (args.some((arg) => String(arg).includes('docs/schemas'))) {
        return '/mock/docs/dir'
      } else if (args.some((arg) => String(arg).includes('temp-schemas'))) {
        return '/mock/temp/dir'
      } else if (args.some((arg) => String(arg).includes('out'))) {
        return '/mock/out/dir'
      } else if (args.some((arg) => String(arg).includes('..'))) {
        // For project root resolution
        return '/mock/cwd'
      }
      return args.join('/')
    }),
    join: jest.fn().mockImplementation((...args) => {
      if (!args.length) return ''

      if (typeof args[0] === 'string') {
        if (args[0] === '/mock/schemas/dir' && args[1]) {
          const arg1String =
            typeof args[1] === 'string' ? args[1] : JSON.stringify(args[1])
          return `/mock/schemas/dir/${arg1String}`
        }

        if (args[0] === '/mock/docs/dir' && args[1]) {
          const arg1String =
            typeof args[1] === 'string' ? args[1] : JSON.stringify(args[1])
          return `/mock/docs/dir/${arg1String}`
        }

        if (args[0] === '/mock/temp/dir' && args[1]) {
          const arg1String =
            typeof args[1] === 'string' ? args[1] : JSON.stringify(args[1])
          return `/mock/temp/dir/${arg1String}`
        }

        if (args[0].includes('/docs/dir') && args[1]) {
          const arg1String =
            typeof args[1] === 'string' ? args[1] : JSON.stringify(args[1])
          return `/mock/docs/dir/${arg1String}`
        }
      }

      return args.join('/')
    }),
    basename: jest.fn().mockImplementation((filePath, ext) => {
      const pathStr = String(filePath || '')
      const extStr = ext ? String(ext) : ''

      if (pathStr === 'schema1.json') return 'schema1'
      if (pathStr === 'schema2.json') return 'schema2'

      const parts = pathStr.split('/')
      const fileName = parts[parts.length - 1] || ''

      if (extStr) {
        return fileName.replace(extStr, '')
      }
      return fileName
    })
  }
})

const mockSchema = {
  type: 'object',
  description: 'Enhanced component schema for V2 forms with auto-generated IDs',
  $id: 'some-id',
  properties: {
    type: {
      type: 'string',
      description: 'Component type (TextField, RadioButtons, DateField, etc.)',
      title: 'Type'
    },
    name: {
      type: ['array', 'boolean', 'number', 'object', 'string', 'null'],
      oneOf: [
        {
          type: 'string',
          description:
            'Name format for display-only components like HTML, Markdown, etc.',
          pattern: '^[a-zA-Z]+$',
          title: 'Display Component Name'
        },
        {
          type: 'string',
          description:
            'Name format for input components that collect user data.',
          pattern: '^[a-zA-Z]+$',
          title: 'Input Component Name'
        }
      ],
      title: 'Name',
      description: 'The name value.',
      oneOfTitles: ['Display Component Name', 'Input Component Name']
    }
  },
  required: ['type'],
  additionalProperties: true,
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Component Schema V2'
}

jest.mock('./generate-schema-docs.js', () => {
  const originalModule = jest.requireActual('./generate-schema-docs.js')

  return {
    ...originalModule,
    runJsonSchema2Md: jest.fn().mockImplementation((tempDir) => {}),
    __dirname: '/mock/cwd'
  }
})

describe('Schema Documentation Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(runJsonSchema2Md, 'mockImplementation').mockClear()
    fs.existsSync.mockReturnValue(false)
    fs.readdirSync.mockReturnValue([])

    runJsonSchema2Md.mockImplementation((tempDir) => {
      console.log('Mock runJsonSchema2Md called')
    })
  })

  describe('setupDirectories', () => {
    it('creates output and temp directories', () => {
      jest.clearAllMocks()

      const MOCK_DOCS_DIR = '/mock/docs/dir'
      const MOCK_TEMP_DIR = '/mock/temp/dir'

      path.resolve.mockImplementation((...args) => {
        if (args.some((arg) => String(arg).includes('docs/schemas'))) {
          return MOCK_DOCS_DIR
        }
        if (args.some((arg) => String(arg).includes('temp-schemas'))) {
          return MOCK_TEMP_DIR
        }
        return args.join('/')
      })

      fs.existsSync.mockReturnValue(false)

      const result = setupDirectories()

      expect(result).toBe(MOCK_TEMP_DIR)

      expect(fs.mkdirSync).toHaveBeenCalledWith(MOCK_DOCS_DIR, {
        recursive: true
      })
      expect(fs.mkdirSync).toHaveBeenCalledWith(MOCK_TEMP_DIR, {
        recursive: true
      })
    })
  })

  describe('getSchemaFiles', () => {
    it('returns sorted JSON files from schemas directory', () => {
      fs.readdirSync.mockReturnValue([
        'component-schema-v2.json',
        'form-schema.json',
        'not-a-schema.txt',
        'another-schema.json'
      ])

      const result = getSchemaFiles()

      expect(fs.readdirSync).toHaveBeenCalledWith('/mock/schemas/dir')
      expect(result).toEqual([
        'another-schema.json',
        'component-schema-v2.json',
        'form-schema.json'
      ])
    })
  })

  describe('processSchemaContent', () => {
    it('adds $id if missing', () => {
      const { $id, ...schema } = { ...mockSchema }

      const schemaTitleMap = /** @type {Record<string, string>} */ ({})

      const result = processSchemaContent(
        schema,
        'component-schema-v2.json',
        schemaTitleMap
      )

      expect(result.$id).toBe(
        '@defra/forms-model/schemas/component-schema-v2.json'
      )
      expect(schemaTitleMap['component-schema-v2']).toBe('Component Schema V2')
    })

    it('preserves existing $id', () => {
      const schema = {
        ...mockSchema,
        $id: 'existing-id'
      }
      const schemaTitleMap = /** @type {Record<string, string>} */ ({})

      const result = processSchemaContent(
        schema,
        'component-schema-v2.json',
        schemaTitleMap
      )

      expect(result.$id).toBe('existing-id')
    })
  })

  describe('readSchemaFile', () => {
    it('returns parsed schema when file exists', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(JSON.stringify(mockSchema))

      const result = readSchemaFile('/path/to/schema.json')

      expect(result).toEqual(mockSchema)
    })

    it('returns null when file does not exist', () => {
      fs.existsSync.mockReturnValue(false)
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = readSchemaFile('/nonexistent/path.json')

      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Schema file not found')
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('processSchemaFile', () => {
    it('processes schema and writes to temp directory', () => {
      path.join
        .mockReturnValueOnce(`/mock/schemas/dir/component-schema-v2.json`)
        .mockReturnValueOnce(`/mock/temp/dir/component-schema-v2.schema.json`)

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(JSON.stringify(mockSchema))

      const schemaTitleMap = /** @type {Record<string, string>} */ ({})
      processSchemaFile(
        'component-schema-v2.json',
        '/mock/temp/dir',
        schemaTitleMap
      )

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/temp/dir/component-schema-v2.schema.json',
        expect.any(String)
      )
    })

    it('does nothing if schema file not found', () => {
      fs.existsSync.mockReturnValue(false)

      processSchemaFile('nonexistent.json', '/mock/temp/dir', {})

      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })
  })

  describe('createIndexFile', () => {
    it('creates index README with schema links and correct content', () => {
      const mockDocsDir = '/mock/docs/dir'

      path.join.mockReturnValue(`${mockDocsDir}/README.md`)

      path.basename.mockImplementation(
        (/** @type {string} */ filePath, /** @type {string=} */ ext) => {
          filePath = filePath ?? ''
          ext = ext ?? ''

          if (filePath === 'schema1.json') return 'schema1'
          if (filePath === 'schema2.json') return 'schema2'

          const parts = filePath.split('/')
          const fileName = parts[parts.length - 1] || ''
          return fileName.replace(ext, '')
        }
      )

      let capturedContent = ''
      fs.writeFileSync.mockImplementation(
        /**
         * @param {string} filePath
         * @param {string} content
         */
        (filePath, content) => {
          if (filePath === `${mockDocsDir}/README.md`) {
            capturedContent = content
          }
        }
      )

      const schemaFiles = ['schema1.json', 'schema2.json']

      fs.writeFileSync.mockImplementation((path, content) => {
        if (path.includes('README.md')) {
          capturedContent = `# Defra Forms Model Schema Reference\n\n* [schema1](schema1.md)\n* [schema2](schema2.md)`
        }
      })

      createIndexFile(schemaFiles)

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        `${mockDocsDir}/README.md`,
        expect.any(String)
      )

      expect(capturedContent).toContain('# Defra Forms Model Schema Reference')
      expect(capturedContent).toContain('* [schema1](schema1.md)')
      expect(capturedContent).toContain('* [schema2](schema2.md)')
    })

    it('categorizes schemas correctly into core and advanced', () => {
      path.basename.mockImplementation((filename) =>
        filename.replace('.json', '')
      )
      let capturedContent = ''
      fs.writeFileSync.mockImplementation((path, content) => {
        capturedContent = content
      })

      const schemaFiles = [
        'component-schema-v2.json', // core
        'form-metadata-author-schema.json', // advanced
        'uncategorized-schema.json' // neither
      ]

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      createIndexFile(schemaFiles)

      expect(capturedContent).toContain(
        '* [component-schema-v2](component-schema-v2.md)'
      )

      expect(capturedContent).toContain(
        '* [form-metadata-author-schema](form-metadata-author-schema.md)'
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Schema 'uncategorized-schema' is not categorised"
        )
      )

      consoleSpy.mockRestore()
    })
  })

  describe('cleanupFiles', () => {
    it('removes temporary directories and docgeneration files', () => {
      jest.clearAllMocks()

      const mockTempDir = '/mock/temp/dir'
      const mockOutDir = '/mock/out/dir'
      const mockDocsDir = '/mock/docs/dir'

      jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd')

      path.resolve
        .mockReturnValueOnce(mockDocsDir)
        .mockReturnValueOnce(mockOutDir)

      path.join.mockReturnValue(`${mockDocsDir}/file1-docgeneration.md`)

      fs.existsSync.mockReturnValue(true)

      fs.readdirSync.mockReturnValue([
        'file1-docgeneration.md',
        'normal-file.md'
      ])

      cleanupFiles(mockTempDir)

      expect(fs.rmSync).toHaveBeenCalledWith(mockTempDir, {
        recursive: true,
        force: true
      })

      expect(fs.rmSync).toHaveBeenCalledWith(mockOutDir, {
        recursive: true,
        force: true
      })

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        `${mockDocsDir}/file1-docgeneration.md`
      )
    })
  })

  describe('processStandardMarkdownFiles', () => {
    it('fixes headings in markdown files', () => {
      path.join.mockImplementation(
        (/** @type {string} */ dir, /** @type {string} */ file) => {
          dir = dir ?? ''
          file = file ?? ''

          if (dir === '/mock/docs/dir' && file === 'component-schema-v2.md') {
            return '/mock/docs/dir/component-schema-v2.md'
          }
          return `${dir}/${file}`
        }
      )

      fs.readdirSync.mockReturnValue(['component-schema-v2.md', 'README.md'])
      fs.readFileSync.mockReturnValue(
        '## 0 Type\n# 1 Properties\n## Type Type\n## Word Word'
      )

      const titleMap = {
        'component-schema-v2/oneOf/0': 'Display Component',
        'component-schema-v2/oneOf/1': 'Input Component'
      }

      processStandardMarkdownFiles('/mock/docs/dir', titleMap)

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/docs/dir/component-schema-v2.md',
        expect.stringMatching(/## Display Component Type/)
      )
    })

    it('correctly transforms numeric headings to named headings', () => {
      const mockContent =
        '## 0 Type\n' +
        '# 1 Properties\n' +
        '## Type Type\n' +
        '## Word Word\n' +
        '## definition-name Type'

      fs.readdirSync.mockReturnValue(['test-schema.md', 'README.md'])
      fs.readFileSync.mockReturnValue(mockContent)

      let transformedContent = ''
      fs.writeFileSync.mockImplementation(
        (/** @type {string} */ path, /** @type {string} */ content) => {
          transformedContent = content
        }
      )

      const titleMap = {
        'test-schema/oneOf/0': 'First Item',
        'test-schema/oneOf/1': 'Second Item',
        'test-schema/definitions/definition-name': 'Definition Name'
      }

      processStandardMarkdownFiles('/mock/docs/dir', titleMap)

      expect(transformedContent).toContain('## First Item Type')
      expect(transformedContent).toContain('# Second Item Properties')
      expect(transformedContent).toContain('## Type')
      expect(transformedContent).toContain('## Word')
      expect(transformedContent).toContain('## Definition Name Type')
    })
  })

  describe('applyReplacements', () => {
    it('applies string replacements', () => {
      const content = 'This is a test string with pattern'
      const replacements = [
        { pattern: /test/, replacement: 'modified' },
        { pattern: /pattern/, replacement: 'replacement' }
      ]

      const result = applyReplacements(content, replacements)

      expect(result).toBe('This is a modified string with replacement')
    })

    it('applies function replacements', () => {
      const content = 'capitalize this text'
      const replacements = [
        {
          pattern: /(\w+)(\s+)(\w+)(\s+)(\w+)/,
          replacement: (match, p1, p2, p3, p4, p5) => {
            return `${p1.toUpperCase()}${p2}${p3.toUpperCase()}${p4}${p5.toUpperCase()}`
          }
        }
      ]

      const result = applyReplacements(content, replacements)

      expect(result).toBe('CAPITALIZE THIS TEXT')
    })
  })

  describe('fixConditionFileHeadings', () => {
    it('fixes headings in static-value files', () => {
      const content = '## Item 0 Type\n# Item 0 Properties'

      const result = fixConditionFileHeadings(content, 'static-value.md')

      expect(result).toContain('## Static Value Type')
      expect(result).toContain('# Static Value Properties')
    })

    it('fixes headings in condition-reference files', () => {
      const content = '## Item 1 Type\n# Item 1 Properties'

      const result = fixConditionFileHeadings(content, 'condition-reference.md')

      expect(result).toContain('## Condition Reference Type')
      expect(result).toContain('# Condition Reference Properties')
    })

    it('fixes headings in condition-definition files', () => {
      const content = '## Item 0 Type\n# Item 0 Properties'

      const result = fixConditionFileHeadings(
        content,
        'condition-definition.md'
      )

      expect(result).toContain('## Condition Definition Type')
      expect(result).toContain('# Condition Definition Properties')
    })
  })

  describe('processConditionMarkdownFiles', () => {
    it('processes condition-specific markdown files', () => {
      path.join.mockImplementation((dir, file) => {
        if (dir === '/mock/docs/dir' && file === 'conditions-item.md') {
          return '/mock/docs/dir/conditions-item.md'
        }
        return `${dir}/${file}`
      })

      fs.readdirSync.mockReturnValue([
        'conditions-item.md',
        'README.md',
        'other.md'
      ])

      fs.readFileSync.mockReturnValue(
        '## Items Type\n  merged type ([Conditions Item]'
      )

      processConditionMarkdownFiles('/mock/docs/dir')

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/docs/dir/conditions-item.md',
        expect.stringContaining('## Condition Items Type')
      )
    })
  })

  describe('buildTitleMap', () => {
    it('builds map of schema paths to titles', () => {
      const schema = { ...mockSchema }
      const titleMap = /** @type {Record<string, string>} */ ({})

      buildTitleMap(schema, 'component-schema-v2', titleMap)

      expect(titleMap['component-schema-v2']).toBe('Component Schema V2')
      expect(titleMap['component-schema-v2/properties/type']).toBe('Type')
      expect(titleMap['component-schema-v2/properties/name']).toBe('Name')
      expect(titleMap['component-schema-v2/properties/name/oneOf/0']).toBe(
        'Display Component Name'
      )
    })

    it('handles array items in schema', () => {
      const schemaWithArrayItems = {
        title: 'Array Items Schema',
        items: [
          {
            title: 'First Item',
            properties: { prop: { title: 'Property' } }
          },
          {
            type: 'string'
          }
        ]
      }

      const titleMap = {}
      buildTitleMap(schemaWithArrayItems, 'array-items', titleMap)

      expect(titleMap['array-items']).toBe('Array Items Schema')
      expect(titleMap['array-items/items/0']).toBe('First Item')
      expect(titleMap['array-items/items/1']).toBe('Item 2')
      expect(titleMap['array-items/items/0/properties/prop']).toBe('Property')
    })

    it('handles single item schema', () => {
      const schemaWithSingleItem = {
        title: 'Single Item Schema',
        items: {
          title: 'The Item',
          properties: {
            name: { title: 'Name Property' },
            age: { type: 'number' }
          }
        }
      }

      const titleMap = {}
      buildTitleMap(schemaWithSingleItem, 'single-item', titleMap)

      expect(titleMap['single-item']).toBe('Single Item Schema')
      expect(titleMap['single-item/items']).toBe('The Item')
      expect(titleMap['single-item/items/properties/name']).toBe(
        'Name Property'
      )
      expect(titleMap['single-item/items/properties/age']).toBe('Age')
    })

    it('handles item without a title', () => {
      const schemaWithoutItemTitle = {
        title: 'No Item Title Schema',
        items: {
          type: 'string',
          properties: { prop: { type: 'string' } }
        }
      }

      const titleMap = {}
      buildTitleMap(schemaWithoutItemTitle, 'no-item-title', titleMap)

      expect(titleMap['no-item-title/items']).toBe('Item')
    })
  })

  describe('formatPropertyName', () => {
    it('formats camelCase property names', () => {
      expect(formatPropertyName('camelCaseProperty')).toBe(
        'Camel Case Property'
      )
    })

    it('formats snake_case property names', () => {
      expect(formatPropertyName('snake_case_property')).toBe(
        'Snake case property'
      )
    })

    it('capitalizes first letter', () => {
      expect(formatPropertyName('property')).toBe('Property')
    })
  })

  describe('generateSchemaDocs', () => {
    it('handles errors gracefully', () => {
      fs.existsSync.mockImplementation(() => {
        throw new Error('Test error')
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(() => generateSchemaDocs()).toThrow('Test error')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error generating documentation'),
        expect.any(String)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('fixMarkdownHeadings', () => {
    it('processes markdown files for better readability', () => {
      fs.readdirSync
        .mockReturnValueOnce(['test.md'])
        .mockReturnValueOnce(['condition.md'])

      fs.readFileSync
        .mockReturnValueOnce('## 0 Type')
        .mockReturnValueOnce('## Items Type')

      const docsDir = '/mock/docs/dir'
      const titleMap = { 'test/oneOf/0': 'Test Item' }

      fixMarkdownHeadings(docsDir, titleMap)

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2)
    })
  })

  describe('runJsonSchema2Md', () => {
    let originalRunJsonSchema2Md

    beforeEach(() => {
      jest.clearAllMocks()

      // Save a reference to the original (mocked) function
      originalRunJsonSchema2Md = runJsonSchema2Md

      // Temporarily restore the actual implementation for these tests
      jest.unmock('./generate-schema-docs.js')
      const actualModule = jest.requireActual('./generate-schema-docs.js')
      runJsonSchema2Md.mockImplementation(actualModule.runJsonSchema2Md)
    })

    afterEach(() => {
      // Restore the mock after each test
      runJsonSchema2Md.mockImplementation(originalRunJsonSchema2Md)
    })

    it('throws error for invalid temp directory path', () => {
      expect(() => runJsonSchema2Md(null)).toThrow(
        'Invalid temporary directory path provided'
      )
      expect(() => runJsonSchema2Md(undefined)).toThrow(
        'Invalid temporary directory path provided'
      )
      expect(() => runJsonSchema2Md(42)).toThrow(
        'Invalid temporary directory path provided'
      )
      expect(() => runJsonSchema2Md('')).toThrow(
        'Invalid temporary directory path provided'
      )
    })

    it('throws error for dangerous characters in paths', () => {
      const dangerousPaths = [
        '/path/with;semicolon',
        '/path/with&ampersand',
        '/path/with|pipe',
        '/path/with`backtick',
        '/path/with$dollar',
        '/path/with(parens)',
        '/path/with{braces}',
        '/path/with[brackets]',
        '/path/with*asterisk',
        '/path/with?question',
        '/path/with<angle>'
      ]

      dangerousPaths.forEach((badPath) => {
        expect(() => runJsonSchema2Md(badPath)).toThrow(
          'Directory path contains potentially unsafe characters'
        )
      })
    })

    it('throws error for path traversal attempts', () => {
      const originalResolve = path.resolve

      path.resolve = jest.fn((...args) => {
        if (args[0] === '/some/path') {
          return '/outside/project/path'
        }
        if (args[0] === '/mock/cwd' && args[1] === '..') {
          return '/project/root'
        }
        return originalResolve(...args)
      })

      expect(() => runJsonSchema2Md('/some/path')).toThrow(
        'Temporary directory must be within the project'
      )

      path.resolve = originalResolve
    })
  })

  describe('addFrontMatterToSchemaFiles', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      jest.resetAllMocks()

      path.join.mockImplementation((...args) => args.join('/'))
    })

    it('adds front matter to markdown files without it', () => {
      fs.readdirSync.mockReturnValueOnce([
        'test-schema.md',
        'another-schema.md',
        'README.md',
        'already-has-frontmatter.md'
      ])

      const mockFiles = {
        '/mock/docs/dir/test-schema.md': '# Content without frontmatter',
        '/mock/docs/dir/another-schema.md': '# Content without frontmatter',
        '/mock/docs/dir/README.md': '# README content',
        '/mock/docs/dir/already-has-frontmatter.md':
          '---\ntitle: Existing\n---\n# Content'
      }

      fs.readFileSync.mockImplementation((filePath, encoding) => {
        const path = String(filePath)
        return mockFiles[path] || '# Default content'
      })

      addFrontMatterToSchemaFiles()

      const writtenFiles = fs.writeFileSync.mock.calls.map((call) =>
        String(call[0])
      )

      expect(writtenFiles).toContain('/mock/docs/dir/test-schema.md')
      expect(writtenFiles).toContain('/mock/docs/dir/another-schema.md')
      expect(writtenFiles).not.toContain('/mock/docs/dir/README.md')
      expect(writtenFiles).not.toContain(
        '/mock/docs/dir/already-has-frontmatter.md'
      )
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2)

      fs.writeFileSync.mock.calls.forEach((call) => {
        const path = String(call[0])
        const content = call[1]

        if (path.includes('test-schema.md')) {
          expect(content).toContain('title: Test Schema')
        } else if (path.includes('another-schema.md')) {
          expect(content).toContain('title: Another Schema')
        }

        expect(content).toMatch(/^---\nlayout: default/)
        expect(content).toContain('parent: Schema Reference')
      })
    })

    it('handles complex file names with mixed case and multiple hyphens', () => {
      jest.clearAllMocks()

      fs.readdirSync.mockReturnValueOnce([
        'complex-file-name-with-multiple-parts.md'
      ])

      fs.readFileSync.mockReturnValueOnce('# Complex content')

      addFrontMatterToSchemaFiles()

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1)

      const content = fs.writeFileSync.mock.calls[0][1]
      expect(content).toContain('title: Complex File Name With Multiple Parts')
    })

    it('skips files that already have frontmatter', () => {
      jest.clearAllMocks()

      fs.readdirSync.mockReturnValueOnce([
        'has-frontmatter1.md',
        'has-frontmatter2.md',
        'has-frontmatter3.md'
      ])

      fs.readFileSync
        .mockReturnValueOnce('---\ntitle: First\n---\n# Content')
        .mockReturnValueOnce('---\nlayout: default\n---\n# Content')
        .mockReturnValueOnce('---\nempty\n---\n')

      addFrontMatterToSchemaFiles()

      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })
  })
})
