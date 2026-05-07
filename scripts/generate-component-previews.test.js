// @ts-nocheck

import { fixtures } from './component-preview-fixtures.js'

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
      'AutocompleteField'
    ]
    for (const type of listTypes) {
      expect(fixtures[type]).toBeDefined()
      expect(typeof fixtures[type].model?.getList).toBe('function')
    }
  })
})
