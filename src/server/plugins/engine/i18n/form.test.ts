import { FormStatus } from '@defra/forms-model'

import { getCachedFormTranslatorBasic } from '~/src/server/plugins/engine/i18n/form.js'

describe('form', () => {
  describe('getCachedFormTranslatorBasic', () => {
    test('add to cache', () => {
      // This will add to the empty cache
      const res = getCachedFormTranslatorBasic(
        'id1',
        'title1',
        FormStatus.Draft,
        'cy'
      )
      expect(res).toBeDefined()
      expect(res.tForm('title')).toBe('title1')
      // This will retrieve from the cache, therefore title won't change
      const res2 = getCachedFormTranslatorBasic(
        'id1',
        'titleXXX',
        FormStatus.Draft,
        'cy'
      )
      expect(res2).toBeDefined()
      expect(res2.tForm('title')).toBe('title1')
    })
  })
})
