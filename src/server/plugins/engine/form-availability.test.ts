import Boom from '@hapi/boom'

import {
  assertFormAvailable,
  isOfflineBoom
} from '~/src/server/plugins/engine/form-availability.js'
import { metadata } from '~/test/fixtures/form.js'

describe('form-availability', () => {
  describe('assertFormAvailable', () => {
    it('should do nothing if form is online', () => {
      expect(() =>
        assertFormAvailable({ ...metadata, offline: false })
      ).not.toThrow()
      expect(() =>
        assertFormAvailable({ ...metadata, offline: undefined })
      ).not.toThrow()
    })

    it('should throw a 503 Boom error if form is offline', () => {
      expect(() => assertFormAvailable({ ...metadata, offline: true })).toThrow(
        expect.objectContaining({
          message: `Form ${metadata.slug} is offline`,
          data: {
            offline: true,
            metadata: { ...metadata, offline: true }
          }
        })
      )
    })
  })

  describe('isOfflineBoom', () => {
    it('should return false for non-Boom errors', () => {
      expect(isOfflineBoom(new Error('test'))).toBe(false)
      expect(isOfflineBoom(null)).toBe(false)
      expect(isOfflineBoom({})).toBe(false)
    })

    it('should return false for Boom errors without offline marker', () => {
      expect(isOfflineBoom(Boom.notFound())).toBe(false)
      expect(isOfflineBoom(Boom.badRequest('test', { offline: false }))).toBe(
        false
      )
    })

    it('should return true for valid offline Boom errors', () => {
      const offlineErr = Boom.boomify(new Error('offline'), {
        statusCode: 503,
        data: { offline: true, metadata }
      })
      expect(isOfflineBoom(offlineErr)).toBe(true)
    })

    it('should return false if metadata is missing from data', () => {
      const invalidErr = Boom.boomify(new Error('offline'), {
        statusCode: 503,
        data: { offline: true }
      })
      expect(isOfflineBoom(invalidErr)).toBe(false)
    })
  })
})
