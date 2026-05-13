// @ts-nocheck

jest.mock(
  '~/src/server/plugins/engine/components/helpers/components.ts',
  () => ({ createComponent: jest.fn() })
)

import { pageFixtures } from './page-preview-fixtures.js'

import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.ts'

beforeEach(() => {
  createComponent.mockReturnValue({
    getViewModel: jest.fn().mockReturnValue({ id: 'field', name: 'field' })
  })
})

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

  it('every fixture has a viewName string', () => {
    for (const [_key, fixture] of Object.entries(pageFixtures)) {
      expect(typeof fixture.viewName).toBe('string')
    }
  })

  it('every fixture has either context or variants, not neither', () => {
    for (const [_key, fixture] of Object.entries(pageFixtures)) {
      const hasContext = !!fixture.context
      const hasVariants = !!fixture.variants
      expect(hasContext || hasVariants).toBe(true)
    }
  })

  it('variant fixtures have label and context on every variant', () => {
    const variantFixtures = Object.entries(pageFixtures).filter(
      ([, fixture]) => fixture.variants
    )
    expect(variantFixtures.length).toBeGreaterThan(0)
    for (const [, fixture] of variantFixtures) {
      for (const variant of fixture.variants) {
        expect(typeof variant.label).toBe('string')
        expect(variant.context).toBeDefined()
      }
    }
  })

  it('FileUploadPageController and RepeatPageController have exactly 2 variants', () => {
    expect(pageFixtures.FileUploadPageController.variants).toHaveLength(2)
    expect(pageFixtures.RepeatPageController.variants).toHaveLength(2)
  })

  it('FileUploadPageController variants reference the FileUploadField component fixture', () => {
    for (const variant of pageFixtures.FileUploadPageController.variants) {
      const _model = variant.context.formComponent.model // trigger lazy getter
    }
    expect(createComponent).toHaveBeenCalled()
  })
})
