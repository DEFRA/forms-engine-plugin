import Joi from 'joi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const pluginRegistrationOptionsSchema = Joi.object({
  model: Joi.object().optional(),
  services: Joi.object().optional(),
  controllers: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  cacheName: Joi.string().optional(),
  filters: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  pluginPath: Joi.string().optional(),
  nunjucks: Joi.object({
    baseLayoutPath: Joi.string().required(),
    paths: Joi.array().items(Joi.string()).required()
  }).required(),
  viewContext: Joi.function().required(),
  preparePageEventRequestOptions: Joi.function().optional(),
  onRequest: Joi.function().optional(),
  baseUrl: Joi.string().uri().required()
})

/**
 * Validates the plugin options against the schema and returns the validated value.
 * @param {PluginOptions} options
 * @returns {PluginOptions}
 */
export function validatePluginOptions(options) {
  const result = pluginRegistrationOptionsSchema.validate(options, {
    abortEarly: false
  })

  if (result.error) {
    logger.error(
      `Missing required properties in plugin options: ${result.error.message}`
    )
    throw new Error('Invalid plugin options', result.error)
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.value
}

/**
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 */
