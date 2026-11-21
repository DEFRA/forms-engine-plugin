import hapiPino from 'hapi-pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

/** @type {{ plugin: Plugin<Options>, options: typeof loggerOptions }} */
export const requestLogger =
  /** @satisfies {ServerRegisterPluginObject<Options>} */ ({
    plugin: hapiPino,
    options: loggerOptions
  })

/**
 * @import { Plugin, ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { Options } from 'hapi-pino'
 */
