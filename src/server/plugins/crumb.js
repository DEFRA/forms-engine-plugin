import crumb from '@hapi/crumb'

import { config } from '~/src/config/index.js'

/**
 * @param {RouteConfig} [routeConfig]
 * @returns {ServerRegisterPluginObject<RegisterOptions>}
 */
export const configureCrumbPlugin = (routeConfig) => {
  return {
    plugin: crumb,
    options: {
      logUnauthorized: true,
      enforce: routeConfig?.enforceCsrf ?? config.get('enforceCsrf'),
      cookieOptions: {
        isSecure: config.get('isProduction')
      }
    }
  }
}

/**
 * @import { RegisterOptions } from '@hapi/crumb'
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { RouteConfig } from '~/src/server/types.js'
 */
