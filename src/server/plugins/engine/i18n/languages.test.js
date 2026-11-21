import {
  getAvailableLanguages,
  resolveFormLanguage
} from '~/src/server/plugins/engine/i18n/languages.js'

describe('languages', () => {
  describe('getAvailableLanguages', () => {
    it('should return list of two languages', () => {
      const def = /** @type {FormDefinition} */ (
        /** @type {unknown} */ ({
          metadata: {
            translations: {
              cy: {}
            }
          }
        })
      )
      expect(getAvailableLanguages(def)).toEqual([
        { code: 'en-GB', name: 'English' },
        { code: 'cy', name: 'Cymraeg' }
      ])
    })

    it('should return empty list if no translations', () => {
      const def = /** @type {FormDefinition} */ (
        /** @type {unknown} */ ({
          metadata: {}
        })
      )
      expect(getAvailableLanguages(def)).toEqual([])
    })
  })

  describe('resolveFormLanguage', () => {
    const welshDef = /** @type {FormDefinition} */ (
      /** @type {unknown} */ ({
        metadata: { translations: { cy: {} } }
      })
    )

    it('returns the requested language when the form has translations for it', () => {
      expect(resolveFormLanguage(welshDef, 'cy')).toBe('cy')
    })

    it('returns English when the form has no translations for the requested language', () => {
      const def = /** @type {FormDefinition} */ (
        /** @type {unknown} */ ({ metadata: {} })
      )
      expect(resolveFormLanguage(def, 'cy')).toBe('en-GB')
    })

    it('returns English when the language is not known', () => {
      expect(resolveFormLanguage(welshDef, 'fr')).toBe('en-GB')
    })

    it('returns English for English', () => {
      expect(resolveFormLanguage(welshDef, 'en-GB')).toBe('en-GB')
    })
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
