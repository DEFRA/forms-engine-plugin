/** @type {Server} */
export const server = /** @type {Server} */ ({
  plugins: {
    'forms-engine-plugin': {
      baseLayoutPath: '',
      cacheService: /** @type {CacheService} */ ({})
    }
  }
}) // only mocking out properties we care about;

/** @type {Server} */
export const serverWithSaveAndExit = /** @type {Server} */ ({
  plugins: {
    ...server.plugins,
    'forms-engine-plugin': {
      ...server.plugins['forms-engine-plugin'],
      saveAndExit: /** @type {Pick<PluginOptions, 'saveAndExit'>} */ (
        jest.fn().mockReturnValue({})
      )
    }
  }
}) // only mocking out properties we care about

/**
 * @import { Server } from '@hapi/hapi'
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 * @import { CacheService } from '~/src/server/services/index.js'
 */
