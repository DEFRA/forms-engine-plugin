// @ts-nocheck

import { jest } from '@jest/globals'

// Prevent TypeScript from initialising its node system adapter (which uses
// the real fs) when we load the module under test in this environment.
jest.mock('typescript', () => ({
  SyntaxKind: { ExportKeyword: 93 },
  ScriptTarget: { Latest: 99 },
  createSourceFile: jest.fn(),
  forEachChild: jest.fn(),
  isInterfaceDeclaration: jest.fn(() => false),
  isEnumDeclaration: jest.fn(() => false),
  isTypeAliasDeclaration: jest.fn(() => false),
  isPropertySignature: jest.fn(() => false),
  isIntersectionTypeNode: jest.fn(() => false),
  isTypeLiteralNode: jest.fn(() => false),
  isIndexedAccessTypeNode: jest.fn(() => false),
  isTypeReferenceNode: jest.fn(() => false),
  isLiteralTypeNode: jest.fn(() => false),
  isEnumMember: jest.fn(() => false),
  isUnionTypeNode: jest.fn(() => false)
}))

// jest.mock factories are hoisted before variable declarations, so the
// component-metadata.json payload must be inlined rather than referenced.
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn().mockImplementation((filePath) => {
    if (String(filePath ?? '').includes('component-metadata.json')) {
      return '{"components":{"TextField":"Single-line text input."},"pages":{"PageController":"The default page type.","RepeatPageController":"Allows repeated answers."},"properties":{"rows":"Number of rows for the textarea."},"pageProperties":{"repeat.options.name":"Identifier for the repeatable section."}}'
    }
    return ''
  }),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn()
}))

import {
  controllerLabel,
  controllerSlug,
  deriveCategory,
  generateExample,
  generatePageExample,
  placeholderForType,
  setNestedValue,
  simplifyType,
  toKebabCase,
  toLabel
} from './generate-component-docs.js'

describe('Component Documentation Generator', () => {
  describe('toKebabCase', () => {
    it('converts PascalCase to kebab-case', () => {
      expect(toKebabCase('TextField')).toBe('text-field')
    })

    it('handles multi-word PascalCase', () => {
      expect(toKebabCase('RepeatPageController')).toBe('repeat-page-controller')
    })

    it('leaves already-lowercase strings unchanged', () => {
      expect(toKebabCase('textfield')).toBe('textfield')
    })

    it('does not add leading hyphen for first character', () => {
      expect(toKebabCase('A')).toBe('a')
    })
  })

  describe('toLabel', () => {
    it('converts PascalCase to space-separated words', () => {
      expect(toLabel('TextField')).toBe('Text Field')
    })

    it('applies ACRONYMS substitutions', () => {
      expect(toLabel('UkAddressField')).toBe('UK Address Field')
      expect(toLabel('OsGridRefField')).toBe('OS Grid Ref Field')
      expect(toLabel('Html')).toBe('HTML')
    })

    it('handles controller keys with trailing word', () => {
      expect(toLabel('RepeatPage')).toBe('Repeat Page')
    })
  })

  describe('simplifyType', () => {
    it('returns "unknown" for falsy input', () => {
      expect(simplifyType('')).toBe('unknown')
      expect(simplifyType(null)).toBe('unknown')
      expect(simplifyType(undefined)).toBe('unknown')
    })

    it('returns "object" for object type literals', () => {
      expect(simplifyType('{ foo: string }')).toBe('object')
    })

    it('returns "object" for LanguageMessages references', () => {
      expect(simplifyType('LanguageMessages')).toBe('object')
    })

    it('returns "string" for ListTypeContent and ListTypeOption', () => {
      expect(simplifyType('ListTypeContent')).toBe('string')
      expect(simplifyType('ListTypeOption')).toBe('string')
    })

    it('strips | undefined from union types', () => {
      expect(simplifyType('string | undefined')).toBe('string')
      expect(simplifyType('number | undefined')).toBe('number')
    })

    it('handles array types recursively', () => {
      expect(simplifyType('string[]')).toBe('string[]')
      expect(simplifyType('string | undefined[]')).toBe('string[]')
    })

    it('normalizes extra whitespace', () => {
      expect(simplifyType('  string  ')).toBe('string')
    })
  })

  describe('placeholderForType', () => {
    it('returns 0 for number', () => {
      expect(placeholderForType('number')).toBe(0)
    })

    it('returns true for boolean', () => {
      expect(placeholderForType('boolean')).toBe(true)
    })

    it('returns empty string for string', () => {
      expect(placeholderForType('string')).toBe('')
    })

    it('returns empty array for array types', () => {
      expect(placeholderForType('string[]')).toEqual([])
      expect(placeholderForType('number[]')).toEqual([])
    })

    it('returns empty object for object or unknown types', () => {
      expect(placeholderForType('object')).toEqual({})
      expect(placeholderForType('SomeType')).toEqual({})
    })
  })

  describe('setNestedValue', () => {
    it('sets a top-level key', () => {
      const obj = {}
      setNestedValue(obj, 'foo', 42)
      expect(obj).toEqual({ foo: 42 })
    })

    it('sets a deeply nested key, creating intermediate objects', () => {
      const obj = {}
      setNestedValue(obj, 'a.b.c', 'value')
      expect(obj).toEqual({ a: { b: { c: 'value' } } })
    })

    it('overwrites an existing value at a path', () => {
      const obj = { a: { b: 'old' } }
      setNestedValue(obj, 'a.b', 'new')
      expect(obj.a.b).toBe('new')
    })

    it('replaces a non-object intermediate value with an object', () => {
      const obj = { a: 'string' }
      setNestedValue(obj, 'a.b', 1)
      expect(obj).toEqual({ a: { b: 1 } })
    })
  })

  describe('generateExample', () => {
    it('includes type, name, and title for a basic component', () => {
      const result = generateExample('TextField', {
        options: [],
        schema: [],
        props: []
      })
      expect(result).toMatchObject({
        type: 'TextField',
        name: 'fieldName',
        title: 'Question title'
      })
    })

    it('includes empty options object when optional options exist', () => {
      const result = generateExample('TextField', {
        options: [{ name: 'rows', optional: true, type: 'number' }],
        schema: [],
        props: []
      })
      expect(result.options).toEqual({})
    })

    it('includes required options with placeholder values', () => {
      const result = generateExample('TextField', {
        options: [
          { name: 'rows', optional: false, type: 'number' },
          { name: 'classes', optional: true, type: 'string' }
        ],
        schema: [],
        props: []
      })
      expect(result.options).toEqual({ rows: 0 })
    })

    it('includes required schema fields with placeholder values', () => {
      const result = generateExample('NumberField', {
        options: [],
        schema: [
          { name: 'min', optional: false, type: 'number' },
          { name: 'max', optional: true, type: 'number' }
        ],
        props: []
      })
      expect(result.schema).toEqual({ min: 0 })
    })

    it('includes top-level props in the example using placeholders', () => {
      const result = generateExample('Html', {
        options: [],
        schema: [],
        props: [{ name: 'content', optional: false, type: 'string' }]
      })
      expect(result).toHaveProperty('content', '')
    })

    it('includes list as a top-level prop', () => {
      const result = generateExample('RadiosField', {
        options: [],
        schema: [],
        props: [{ name: 'list', optional: false, type: 'string' }]
      })
      expect(result).toHaveProperty('list', '')
    })

    it('omits options and schema keys when both are empty', () => {
      const result = generateExample('HiddenField', {
        options: [],
        schema: [],
        props: []
      })
      expect(result).not.toHaveProperty('options')
      expect(result).not.toHaveProperty('schema')
    })
  })

  describe('generatePageExample', () => {
    it('omits controller for default PageController', () => {
      const result = generatePageExample('PageController', [])
      expect(result).not.toHaveProperty('controller')
    })

    it('includes controller value for non-default controllers', () => {
      const result = generatePageExample('RepeatPageController', [])
      expect(result.controller).toBe('RepeatPageController')
    })

    it('uses the supplied examplePath', () => {
      const result = generatePageExample('StartPageController', [], '/start')
      expect(result.path).toBe('/start')
    })

    it('defaults to /page-path when examplePath is omitted', () => {
      const result = generatePageExample('PageController', [])
      expect(result.path).toBe('/page-path')
    })

    it('populates required unique props with placeholders using setNestedValue', () => {
      const result = generatePageExample('RepeatPageController', [
        { name: 'repeat.options.name', optional: false, type: 'string' },
        { name: 'repeat.schema.min', optional: true, type: 'number' }
      ])
      expect(result.repeat.options.name).toBe('')
      expect(result.repeat).not.toHaveProperty('schema')
    })
  })

  describe('controllerLabel', () => {
    it('strips Controller suffix and formats words', () => {
      expect(controllerLabel('RepeatPageController')).toBe('Repeat Page')
      expect(controllerLabel('StartPageController')).toBe('Start Page')
      expect(controllerLabel('SummaryPageController')).toBe('Summary Page')
    })

    it('returns empty string for bare "Controller"', () => {
      expect(controllerLabel('Controller')).toBe('')
    })
  })

  describe('controllerSlug', () => {
    it('strips Controller suffix and converts to kebab-case', () => {
      expect(controllerSlug('RepeatPageController')).toBe('repeat-page')
      expect(controllerSlug('StartPageController')).toBe('start-page')
      expect(controllerSlug('FileUploadPageController')).toBe(
        'file-upload-page'
      )
    })
  })

  describe('deriveCategory', () => {
    it('returns category from parsedCategories when present', () => {
      expect(deriveCategory('RadiosField', { RadiosField: 'selection' })).toBe(
        'selection'
      )
    })

    it('returns "input" as the default category', () => {
      expect(deriveCategory('TextField', {})).toBe('input')
      expect(deriveCategory('PaymentField', {})).toBe('input')
      expect(deriveCategory('EastingNorthingField', {})).toBe('input')
    })
  })
})
