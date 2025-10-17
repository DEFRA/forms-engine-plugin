import { getRoutes } from '~/src/server/plugins/engine/routes/repeaters/item-delete.js'
import { type OnRequestCallback } from '~/src/server/plugins/engine/types.js'

describe('repeater item-delete routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('route configuration', () => {
    it('should return all expected routes', () => {
      const routes = getRoutes({}, {}, undefined)

      expect(routes).toHaveLength(4)

      const expectedPaths = [
        '/{slug}/{path}/{itemId}/confirm-delete',
        '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete'
      ]

      expectedPaths.forEach((path) => {
        const getRoute = routes.find(
          (route) => route.method === 'get' && route.path === path
        )
        const postRoute = routes.find(
          (route) => route.method === 'post' && route.path === path
        )

        expect(getRoute).toBeDefined()
        expect(postRoute).toBeDefined()
      })
    })

    it('should pass onRequest callback to handlers', () => {
      const onRequestCallback: OnRequestCallback = jest
        .fn()
        .mockResolvedValue(undefined)
      const routes = getRoutes({}, {}, onRequestCallback)

      // Test that the handlers are created with the onRequest callback
      const getRoute = routes.find(
        (route) =>
          route.method === 'get' &&
          route.path === '/{slug}/{path}/{itemId}/confirm-delete'
      )
      const postRoute = routes.find(
        (route) =>
          route.method === 'post' &&
          route.path === '/{slug}/{path}/{itemId}/confirm-delete'
      )

      expect(getRoute?.handler).toBeDefined()
      expect(postRoute?.handler).toBeDefined()
    })
  })

  describe('handler functionality', () => {
    it('should create handlers that accept onRequest callback', () => {
      const onRequestCallback: OnRequestCallback = jest
        .fn()
        .mockResolvedValue(undefined)
      const routes = getRoutes({}, {}, onRequestCallback)

      // Test that the handlers are created with the onRequest callback
      const getRoute = routes.find(
        (route) =>
          route.method === 'get' &&
          route.path === '/{slug}/{path}/{itemId}/confirm-delete'
      )
      const postRoute = routes.find(
        (route) =>
          route.method === 'post' &&
          route.path === '/{slug}/{path}/{itemId}/confirm-delete'
      )

      expect(getRoute?.handler).toBeDefined()
      expect(postRoute?.handler).toBeDefined()

      // Test that handlers are functions
      expect(typeof getRoute?.handler).toBe('function')
      expect(typeof postRoute?.handler).toBe('function')
    })
  })
})
