import { getRoutes } from '~/src/server/plugins/postcode-lookup/routes/index.js'

export const VIEW_PATH = 'src/server/plugins/postcode-lookup/views'

/**
 * @satisfies {NamedPlugin<PostcodeLookupConfiguration>}
 */
export const postcodeLookupPlugin = {
  name: '@defra/forms-engine-plugin/postcode-lookup',
  dependencies: ['@hapi/vision'],
  multiple: false,
  register(server, options) {
    // @ts-expect-error - Request typing
    server.route(getRoutes(options))
  }
}

/**
 * @import { NamedPlugin } from '@hapi/hapi'
 * @import { PostcodeLookupConfiguration } from '~/src/server/plugins/postcode-lookup/types.js'
 */
