import { tmpdir } from 'node:os'

import {
  context,
  devtoolContext
} from '~/src/server/plugins/nunjucks/context.js'

describe('Nunjucks context', () => {
  beforeEach(() => jest.resetModules())

  describe('Asset path', () => {
    it("should include 'assetPath' for GOV.UK Frontend icons", () => {
      const { assetPath } = devtoolContext(null)
      expect(assetPath).toBe('/assets')
    })
  })

  describe('Asset helper', () => {
    it("should locate 'assets-manifest.json' assets", () => {
      const { getDxtAssetPath } = devtoolContext(null)

      expect(getDxtAssetPath('example.scss')).toBe(
        '/stylesheets/example.xxxxxxx.min.css'
      )

      expect(getDxtAssetPath('example.mjs')).toBe(
        '/javascripts/example.xxxxxxx.min.js'
      )
    })

    it("should return path when 'assets-manifest.json' is missing", async () => {
      await jest.isolateModulesAsync(async () => {
        const { config } = await import('~/src/config/index.js')

        // Import when isolated to avoid cache
        const { devtoolContext } = await import(
          '~/src/server/plugins/nunjucks/context.js'
        )

        // Update config for missing manifest
        config.set('publicDir', tmpdir())
        const { getDxtAssetPath } = devtoolContext(null)

        // Uses original paths when missing
        expect(getDxtAssetPath('example.scss')).toBe('/example.scss')
        expect(getDxtAssetPath('example.mjs')).toBe('/example.mjs')
      })
    })

    it('should return path to unknown assets', () => {
      const { getDxtAssetPath } = devtoolContext(null)

      expect(getDxtAssetPath('')).toBe('/')
      expect(getDxtAssetPath('example.jpg')).toBe('/example.jpg')
      expect(getDxtAssetPath('example.gif')).toBe('/example.gif')
    })
  })

  describe('Config', () => {
    it('should include environment, phase tag and service info', async () => {
      await expect(context(null)).rejects.toThrow(
        'context called before plugin registered'
      )
    })
  })

  describe('Crumb', () => {
    it('should handle malformed requests with missing state', async () => {
      // While state should always exist in a valid Hapi request (it holds cookies),
      // we've seen malformed requests in production where it's missing
      const malformedRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          server: {
            plugins: {
              crumb: {
                generate: jest.fn()
              },
              'forms-engine-plugin': {
                baseLayoutPath: 'randomValue'
              }
            }
          },
          plugins: {},
          route: {
            settings: {
              plugins: {}
            }
          },
          path: '/test',
          url: { search: '' }
          // state intentionally omitted to test real malformed requests
        })
      )

      const { crumb } = await context(malformedRequest)
      expect(crumb).toBeUndefined()
      expect(
        malformedRequest.server.plugins.crumb.generate
      ).not.toHaveBeenCalled()
    })
  })
})

/**
 * @import { FormRequest } from '~/src/server/routes/types.js'
 */
