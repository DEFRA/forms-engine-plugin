import { pageFixtures } from './page-preview-fixtures.js'

describe('page-preview-fixtures', () => {
  it('all 6 expected page types are present', () => {
    const expected = [
      'PageController',
      'StartPageController',
      'TerminalPageController',
      'RepeatPageController',
      'FileUploadPageController',
      'SummaryPageController'
    ]
    for (const key of expected) {
      expect(pageFixtures[key]).toBeDefined()
    }
  })

  it('every fixture has either context or variants', () => {
    for (const [_key, fixture] of Object.entries(pageFixtures)) {
      expect(!!fixture.context || !!fixture.variants).toBe(true)
    }
  })

  it('every context has a page.viewName string', () => {
    for (const [_key, fixture] of Object.entries(pageFixtures)) {
      const contexts = fixture.variants
        ? fixture.variants.map((v) => v.context)
        : [/** @type {NonNullable<typeof fixture.context>} */ (fixture.context)]
      for (const context of contexts) {
        expect(typeof context.page?.viewName).toBe('string')
      }
    }
  })

  it('variant fixtures have label and context on every variant', () => {
    const variantFixtures = Object.entries(pageFixtures).filter(
      ([, fixture]) => fixture.variants
    )
    expect(variantFixtures.length).toBeGreaterThan(0)
    for (const [, fixture] of variantFixtures) {
      for (const variant of fixture.variants ?? []) {
        expect(typeof variant.label).toBe('string')
        expect(variant.context).toBeDefined()
      }
    }
  })

  it('FileUploadPageController has exactly 2 variants', () => {
    expect(pageFixtures.FileUploadPageController.variants).toHaveLength(2)
  })
})
