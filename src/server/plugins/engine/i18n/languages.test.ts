import { type FormDefinition } from '@defra/forms-model'

import { getAvailableLanguages } from '~/src/server/plugins/engine/i18n/languages.js'

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
})
