import { EN_GB } from '~/src/server/constants.js'
import { getCachedPluginTranslator } from '~/src/server/plugins/engine/i18n/form.js'
import {
  getDispatchTranslator,
  getSessionState
} from '~/src/server/plugins/postcode-lookup/routes/index.js'

jest.mock('~/src/server/plugins/engine/i18n/form.ts')

describe('postcode-lookup routes', () => {
  describe('getSessionState', () => {
    test('should throw if missing state', () => {
      const mockRequest = /** @type { PostcodeLookupRequest} */ (
        /** @type {any} */
        ({
          yar: {
            get: jest.fn()
          }
        })
      )
      expect(() => getSessionState(mockRequest)).toThrow(
        'No postcode lookup data found for /postcode-lookup'
      )
    })
  })

  describe('getDispatchTranslator', () => {
    test('should get default translator', async () => {
      const mockSet = jest.fn()
      const mockRequest = /** @type { PostcodeLookupRequest} */ (
        /** @type {any} */
        ({
          yar: {
            get: jest.fn(),
            set: mockSet
          },
          query: {},
          server: {
            // eslint-disable-next-line no-useless-computed-key
            plugins: { ['forms-engine-plugin']: { getLanguage: () => 'en-GB' } }
          }
        })
      )
      const mockTranslator = /** @type {Translator} */ ({ language: EN_GB })
      jest.mocked(getCachedPluginTranslator).mockResolvedValue(mockTranslator)
      const initial = /** @type {PostcodeLookupDispatchData} */ ({})
      const res = await getDispatchTranslator(mockRequest, initial, EN_GB)
      expect(mockSet).toHaveBeenCalledWith('language', EN_GB)
      expect(res).toBeDefined()
      expect(res.language).toBe(EN_GB)
    })

    test('should get welsh translator', async () => {
      const mockSet = jest.fn()
      const mockRequest = /** @type { PostcodeLookupRequest} */ (
        /** @type {any} */
        ({
          yar: {
            get: jest.fn().mockResolvedValueOnce('cy'),
            set: mockSet
          },
          query: {},
          server: {
            // eslint-disable-next-line no-useless-computed-key
            plugins: { ['forms-engine-plugin']: { getLanguage: () => 'en-GB' } }
          }
        })
      )
      const mockTranslator = /** @type {Translator} */ ({ language: 'cy' })
      jest.mocked(getCachedPluginTranslator).mockResolvedValue(mockTranslator)
      const initial = /** @type {PostcodeLookupDispatchData} */ ({})
      const res = await getDispatchTranslator(mockRequest, initial, 'cy')
      expect(mockSet).toHaveBeenCalledWith('language', 'cy')
      expect(res).toBeDefined()
      expect(res.language).toBe('cy')
    })
  })
})

/**
 * @import { PostcodeLookupDispatchData, PostcodeLookupRequest } from '~/src/server/plugins/postcode-lookup/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 */
