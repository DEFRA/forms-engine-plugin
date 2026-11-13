import { type FormDefinition } from '@defra/forms-model'

import {
  getAvailableLanguages,
  resolveFormLanguage
} from '~/src/server/plugins/engine/i18n/languages.js'

describe('languages', () => {
  describe('getAvailableLanguages', () => {
    it('should return list of two languages', () => {
      const def = {
        metadata: {
          translations: {
            cy: {}
          }
        }
      } as unknown as FormDefinition
      expect(getAvailableLanguages(def)).toEqual([
        { code: 'en-GB', name: 'English' },
        { code: 'cy', name: 'Cymraeg' }
      ])
    })

    it('should return empty list if no translations', () => {
      const def = {
        metadata: {}
      } as unknown as FormDefinition
      expect(getAvailableLanguages(def)).toEqual([])
    })
  })

  describe('resolveFormLanguage', () => {
    const welshDef = {
      metadata: { translations: { cy: {} } }
    } as unknown as FormDefinition

    it('returns the requested language when the form has translations for it', () => {
      expect(resolveFormLanguage(welshDef, 'cy')).toBe('cy')
    })

    it('returns English when the form has no translations for the requested language', () => {
      const def = { metadata: {} } as unknown as FormDefinition
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
