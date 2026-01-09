import { getRoutes } from '~/src/server/plugins/map/routes/index.js'

/**
 * @satisfies {NamedPlugin<MapConfiguration>}
 */
export const mapPlugin = {
  name: '@defra/forms-engine-plugin/map',
  dependencies: ['@hapi/inert'],
  multiple: false,
  register(server, options) {
    // @ts-expect-error - Request typing
    server.route(getRoutes(options))
  }
}

/**
 * @import { NamedPlugin } from '@hapi/hapi'
 * @import { MapConfiguration } from '~/src/server/plugins/map/types.js'
 */
