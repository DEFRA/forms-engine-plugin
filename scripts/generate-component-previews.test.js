// @ts-nocheck

// jest.mock() is hoisted by Babel before imports — these run first.
// resetMocks: true in jest.config.cjs resets implementations between tests,
// so rendering tests re-establish return values in beforeEach.
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}))

jest.mock('~/src/server/plugins/nunjucks/environment.js', () => ({
  environment: { addFilter: jest.fn(), renderString: jest.fn() }
}))

jest.mock(
  '~/src/server/plugins/engine/components/helpers/components.ts',
  () => ({ createComponent: jest.fn() })
)

import { mkdirSync, writeFileSync } from 'fs'

import { fixtures } from './component-preview-fixtures.js'
import {
  buildPartialMdx,
  renderComponent,
  writePreviewPartial
} from './generate-component-previews.js'

import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.ts'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import { environment } from '~/src/server/plugins/nunjucks/environment.js'

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

  it('every fixture has a jsLevel of 1, 2, or 3', () => {
    for (const fixture of Object.values(fixtures)) {
      expect([1, 2, 3]).toContain(fixture.jsLevel)
    }
  })

  it('every level 1 or 2 fixture has a non-empty jsNotice string or array', () => {
    const lowLevelFixtures = Object.values(fixtures).filter(
      (f) => f.jsLevel === 1 || f.jsLevel === 2
    )
    for (const fixture of lowLevelFixtures) {
      const { jsNotice } = fixture
      expect(typeof jsNotice === 'string' || Array.isArray(jsNotice)).toBe(true)
      const items = Array.isArray(jsNotice) ? jsNotice : [jsNotice]
      expect(items.length).toBeGreaterThan(0)
      for (const item of items) {
        expect(item.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('buildPartialMdx', () => {
  it('wraps a single render in a component-preview div', () => {
    const result = buildPartialMdx([{ html: '<input class="govuk-input">' }])
    expect(result).toContain('className="component-preview app-no-prose"')
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
    const matches = result.match(/className="component-preview app-no-prose"/g)
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

  it('uses custom wrapperClass when provided', () => {
    const result = buildPartialMdx(
      [{ html: '<input>' }],
      'component-preview component-preview--page'
    )
    expect(result).toContain(
      'className="component-preview component-preview--page"'
    )
    expect(result).not.toContain('className="component-preview"')
  })
})

describe('renderComponent', () => {
  let mockGetViewModel

  const mockModel = {
    createTranslator: () => stubTranslator
  }

  beforeEach(() => {
    mockGetViewModel = jest.fn().mockReturnValue({
      type: 'TextField',
      isFormComponent: true,
      model: { label: { text: 'Question' }, name: 'field', id: 'field' }
    })
    createComponent.mockReturnValue({ getViewModel: mockGetViewModel })
    environment.renderString.mockReturnValue(
      '<div class="govuk-form-group"></div>'
    )
  })

  it('calls createComponent with def and model from fixture', () => {
    renderComponent({
      ...fixtures.TextField,
      model: mockModel
    })
    expect(createComponent).toHaveBeenCalledWith(fixtures.TextField.def, {
      model: mockModel
    })
  })

  it('calls getViewModel with payload and empty errors array', () => {
    renderComponent({
      ...fixtures.TextField,
      model: mockModel
    })
    expect(mockGetViewModel).toHaveBeenCalledWith({
      payload: {},
      errors: [],
      translator: stubTranslator
    })
  })

  it('passes viewModel wrapped as { type, model } to renderString', () => {
    renderComponent({
      ...fixtures.TextField,
      model: mockModel
    })
    expect(environment.renderString).toHaveBeenCalledWith(
      expect.stringContaining('componentList'),
      expect.objectContaining({
        components: expect.arrayContaining([
          expect.objectContaining({ type: 'TextField' })
        ])
      })
    )
  })
})

describe('writePreviewPartial', () => {
  beforeEach(() => {
    const mockGetViewModel = jest
      .fn()
      .mockReturnValue({ type: 'TextField', model: {} })
    createComponent.mockReturnValue({ getViewModel: mockGetViewModel })
    environment.renderString.mockReturnValue('<div class="govuk-input"></div>')
  })

  it('writes the partial file to the correct path', () => {
    writePreviewPartial('/out/_previews', 'text-field', fixtures.TextField)
    expect(mkdirSync).toHaveBeenCalledWith('/out/_previews', {
      recursive: true
    })
    expect(writeFileSync).toHaveBeenCalledWith(
      '/out/_previews/text-field.mdx',
      expect.stringContaining('component-preview')
    )
  })

  it('renders once per variant for multi-variant fixtures', () => {
    writePreviewPartial(
      '/out/_previews',
      'payment-field',
      fixtures.PaymentField
    )
    const written = writeFileSync.mock.calls[0][1]
    const matches = written.match(/className="component-preview app-no-prose"/g)
    expect(matches).toHaveLength(2)
  })

  it('appends previewSuffix text wrapped in app-preview-placeholder div', () => {
    const fixture = {
      def: { type: 'TextField', name: 'loc', title: 'Location', options: {} },
      model: null,
      payload: {},
      previewSuffix: 'Map appears here with JavaScript enabled'
    }
    writePreviewPartial('/out/_previews', 'location', fixture)
    const written = writeFileSync.mock.calls[0][1]
    expect(written).toContain('app-preview-placeholder')
    expect(written).toContain('Map appears here with JavaScript enabled')
  })

  it('does not append placeholder when previewSuffix is absent', () => {
    writePreviewPartial('/out/_previews', 'text-field', {
      def: { type: 'TextField', name: 'field', title: 'Field', options: {} },
      model: null,
      payload: {}
    })
    const written = writeFileSync.mock.calls[0][1]
    expect(written).not.toContain('app-preview-placeholder')
  })
})
