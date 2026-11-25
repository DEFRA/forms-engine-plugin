import { config } from '~/src/config/index.js'
import { CacheService, merge } from '~/src/server/services/cacheService.js'

describe('CacheService', () => {
  /** @type {Partial<Server>} */
  let mockServer
  /**
   * @type {{
   *   get: jest.Mock
   *   set: jest.Mock
   *   drop: jest.Mock
   * }}
   */
  let mockCache
  /** @type {CacheService} */
  let cacheService

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      drop: jest.fn()
    }

    mockServer = {
      log: jest.fn(),
      cache: /** @type {Server['cache']} */ (
        /** @type {unknown} */ (
          () => ({
            ...mockCache,
            provision: jest.fn()
          })
        )
      ),
      logger: /** @type {Server['logger']} */ (
        /** @type {unknown} */ ({
          info: jest.fn()
        })
      )
    }

    cacheService = new CacheService({
      server: /** @type {Server} */ (mockServer),
      cacheName: 'test-cache'
    })
  })

  describe('getState', () => {
    describe('when cache exists', () => {
      it('should return cached state', async () => {
        const mockRequest = /** @type {FormRequest} */ (
          /** @type {unknown} */ ({
            yar: { id: 'some-session' },
            params: { state: 'form1', slug: 'page1' }
          })
        )
        const mockState = { someData: 'test' }

        mockCache.get.mockResolvedValue(mockState)

        const result = await cacheService.getState(mockRequest)

        expect(result).toEqual(mockState)
        expect(mockCache.get).toHaveBeenCalledWith({
          segment: 'cache',
          id: 'some-session:form1:page1:'
        })
      })
    })

    describe('when cache does not exist', () => {
      it('should return empty object', async () => {
        const mockRequest = /** @type {FormRequest} */ (
          /** @type {unknown} */ ({
            yar: { id: 'some-session' },
            params: { state: 'form1', slug: 'page1' }
          })
        )

        mockCache.get.mockResolvedValue(null)

        const result = await cacheService.getState(mockRequest)

        expect(result).toEqual({})
      })
    })
  })

  describe('setState', () => {
    it('should set state with correct TTL and return updated state', async () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: { id: 'some-session' },
          params: { state: 'form1', slug: 'page1' }
        })
      )
      const mockState = { someData: 'test' }
      const mockTTL = 3600000

      jest.spyOn(config, 'get').mockReturnValue(mockTTL)

      // Mock getState to return the updated state after set
      jest.spyOn(cacheService, 'getState').mockResolvedValue(mockState)

      await expect(
        cacheService.setState(mockRequest, mockState)
      ).resolves.toEqual(mockState)

      expect(mockCache.set).toHaveBeenCalledWith(
        {
          segment: 'cache',
          id: 'some-session:form1:page1:'
        },
        mockState,
        mockTTL
      )
      expect(cacheService.getState).toHaveBeenCalledWith(mockRequest)
    })
  })

  describe('Key', () => {
    describe('when session ID is missing', () => {
      it('should throw error', () => {
        const mockRequest = /** @type {Request} */ (
          /** @type {unknown} */ ({
            yar: { id: null },
            params: {}
          })
        )

        expect(() => cacheService.Key(mockRequest)).toThrow(
          'No session ID found'
        )
      })
    })
  })

  describe('merge', () => {
    describe('when merging objects', () => {
      it('should merge them correctly', () => {
        const state = { field1: 'some-data-1', field2: 'some-data-2' }
        const update = { field2: 'updated', field3: 'some-data-3' }

        const result = merge(state, update)

        expect(result).toEqual({
          field1: 'some-data-1',
          field2: 'updated',
          field3: 'some-data-3'
        })
      })
    })

    describe('when merging arrays', () => {
      it('should overwrite instead of merge', () => {
        const state = { items: ['some-item-1', 'some-item-2'] }
        const update = { items: ['some-item-3'] }

        const result = merge(state, update)

        expect(result.items).toEqual(['some-item-3'])
      })
    })
  })

  describe('getFlash', () => {
    describe('when messages exist', () => {
      it('should return first message', () => {
        const mockRequest = /** @type {FormRequest} */ (
          /** @type {unknown} */ ({
            yar: {
              id: 'some-session',
              flash: jest
                .fn()
                .mockReturnValue([{ errors: [{ type: 'error' }] }])
            },
            params: { state: 'form1', slug: 'page1' }
          })
        )

        const result = cacheService.getFlash(mockRequest)

        expect(result).toEqual({ errors: [{ type: 'error' }] })
      })
    })

    describe('when no messages exist', () => {
      it('should return undefined', () => {
        const mockRequest = /** @type {FormRequest} */ (
          /** @type {unknown} */ ({
            yar: {
              id: 'some-session',
              flash: jest.fn().mockReturnValue([])
            },
            params: { state: 'form1', slug: 'page1' }
          })
        )

        const result = cacheService.getFlash(mockRequest)

        expect(result).toBeUndefined()
      })
    })
  })

  describe('setFlash', () => {
    it('should set flash message', () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: {
            id: 'some-session',
            flash: jest.fn()
          },
          params: { state: 'form1', slug: 'page1' }
        })
      )
      const message = {
        errors: [
          {
            type: 'error',
            href: '#error',
            name: 'error',
            text: 'Error message',
            path: ['path-abc']
          }
        ]
      }

      cacheService.setFlash(mockRequest, message)

      expect(mockRequest.yar.flash).toHaveBeenCalledWith(
        'some-session:form1:page1:',
        message
      )
    })
  })

  describe('clearState', () => {
    it('should clear state from cache', async () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: { id: 'some-session' },
          params: { state: 'form1', slug: 'page1' }
        })
      )

      await cacheService.clearState(mockRequest)

      expect(mockCache.drop).toHaveBeenCalledWith({
        segment: 'cache',
        id: 'some-session:form1:page1:'
      })
    })

    it('should not clear state when session ID is undefined', async () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: { id: undefined },
          params: { state: 'form1', slug: 'page1' }
        })
      )

      await cacheService.clearState(mockRequest)

      expect(mockCache.drop).not.toHaveBeenCalled()
    })

    it('should not clear state when session ID is null', async () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: { id: null },
          params: { state: 'form1', slug: 'page1' }
        })
      )

      await cacheService.clearState(mockRequest)

      expect(mockCache.drop).not.toHaveBeenCalled()
    })
  })

  describe('getConfirmationState', () => {
    it('should return confirmation state from cache', async () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: { id: 'some-session' },
          params: { state: 'form1', slug: 'page1' }
        })
      )
      const mockState = { confirmed: /** @type {const} */ (true) }

      mockCache.get.mockResolvedValue(mockState)

      const result = await cacheService.getConfirmationState(mockRequest)

      expect(result).toEqual(mockState)
      expect(mockCache.get).toHaveBeenCalledWith({
        segment: 'cache',
        id: 'some-session:form1:page1::confirmation'
      })
    })

    it('should return empty object when no confirmation state exists', async () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: { id: 'some-session' },
          params: { state: 'form1', slug: 'page1' }
        })
      )

      mockCache.get.mockResolvedValue(null)

      const result = await cacheService.getConfirmationState(mockRequest)

      expect(result).toEqual({})
    })
  })

  describe('setConfirmationState', () => {
    it('should set confirmation state in cache', async () => {
      const mockRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          yar: { id: 'some-session' },
          params: { state: 'form1', slug: 'page1' }
        })
      )
      const mockState = { confirmed: /** @type {const} */ (true) }
      const mockTTL = 3600000

      jest.spyOn(config, 'get').mockReturnValue(mockTTL)

      await cacheService.setConfirmationState(mockRequest, mockState)

      expect(mockCache.set).toHaveBeenCalledWith(
        {
          segment: 'cache',
          id: 'some-session:form1:page1::confirmation'
        },
        mockState,
        mockTTL
      )
    })
  })
})

/**
 * @import { Request, Server } from '@hapi/hapi'
 * @import { FormRequest } from '~/src/server/routes/types.js'
 */
