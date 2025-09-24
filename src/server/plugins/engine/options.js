import { getErrorMessage } from '@defra/forms-model'
import Joi from 'joi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { CacheService } from '~/src/server/services/index.js'

const logger = createLogger()

const pluginRegistrationOptionsSchema = Joi.object({
  model: Joi.object().optional(),
  services: Joi.object().optional(),
  controllers: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  cache: Joi.alternatives().try(
    Joi.object().instance(CacheService),
    Joi.string()
  ),
  globals: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  filters: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  pluginPath: Joi.string().optional(),
  nunjucks: Joi.object({
    baseLayoutPath: Joi.string().required(),
    paths: Joi.array().items(Joi.string()).required()
  }).required(),
  viewContext: Joi.function().required(),
  preparePageEventRequestOptions: Joi.function().optional(),
  onRequest: Joi.function().optional(),
  baseUrl: Joi.string().uri().required(),
  saveAndExit: Joi.function().optional()
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
      result.error,
      `Missing required properties in plugin options: ${getErrorMessage(result.error)}`
    )
    throw new Error('Invalid plugin options', result.error)
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.value
}

/**
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 */
