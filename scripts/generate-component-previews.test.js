// @ts-nocheck

import { jest } from '@jest/globals'

// These paths match the static imports in generate-component-previews.js,
// resolved relative to this test file (both in scripts/).
jest.mock('../.server/server/plugins/nunjucks/environment.js', () => ({
  environment: {
    addFilter: jest.fn(),
    renderString: jest
      .fn()
      .mockReturnValue('<div class="govuk-form-group"></div>')
  }
}))

jest.mock(
  '../.server/server/plugins/engine/components/helpers/components.js',
  () => ({
    createComponent: jest.fn().mockReturnValue({
      getViewModel: jest.fn().mockReturnValue({
        type: 'TextField',
        isFormComponent: true,
        model: { label: { text: 'Question' }, name: 'field', id: 'field' }
      })
    })
  })
)

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}))

import { fixtures } from './component-preview-fixtures.js'
import { buildPartialMdx } from './generate-component-previews.js'

describe('component-preview-fixtures', () => {
  it('variant fixtures have a def with type and name, and a label', () => {
    const variantFixtures = Object.values(fixtures).filter((f) => f.variants)
    for (const fixture of variantFixtures) {
      for (const variant of fixture.variants) {
        expect(variant.def.type).toBeDefined()
        expect(variant.def.name).toBeDefined()
        expect(variant.label).toBeDefined()
      }
    }
  })

  it('non-variant fixtures have a def with type matching key, name, and title', () => {
    const nonVariantEntries = Object.entries(fixtures).filter(
      ([, fixture]) => !fixture.variants
    )
    for (const [key, fixture] of nonVariantEntries) {
      expect(fixture.def.type).toBe(key)
      expect(fixture.def.name).toBeDefined()
      expect(fixture.def.title).toBeDefined()
    }
  })

  it('list-based fixtures have a model with getList function', () => {
    const listTypes = [
      'RadiosField',
      'CheckboxesField',
      'SelectField',
      'AutocompleteField',
      'YesNoField'
    ]
    for (const type of listTypes) {
      expect(fixtures[type]).toBeDefined()
      expect(typeof fixtures[type].model?.getList).toBe('function')
    }
  })
})

describe('buildPartialMdx', () => {
  it('wraps a single render in a component-preview div', () => {
    const result = buildPartialMdx([{ html: '<input class="govuk-input">' }])
    expect(result).toContain('className="component-preview"')
    expect(result).toContain('dangerouslySetInnerHTML')
    expect(result).toContain('govuk-input')
  })

  it('renders two blocks with labels for multi-variant components', () => {
    const result = buildPartialMdx([
      { label: 'Before payment', html: '<div>unpaid</div>' },
      { label: 'After payment', html: '<div>paid</div>' }
    ])
    expect(result).toContain('Before payment')
    expect(result).toContain('After payment')
    const matches = result.match(/className="component-preview"/g)
    expect(matches).toHaveLength(2)
  })

  it('escapes backticks and dollar-brace sequences in HTML', () => {
    // Build the input and expected strings without triggering no-template-curly-in-string
    const dollarBrace = '${'
    const result = buildPartialMdx([
      { html: 'a `backtick` and ' + dollarBrace + 'expr}' }
    ])
    expect(result).toContain('\\`backtick\\`')
    expect(result).toContain('\\' + dollarBrace + 'expr}')
  })
})
