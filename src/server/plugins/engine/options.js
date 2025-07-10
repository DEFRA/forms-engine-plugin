import Joi from 'joi'

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
  preparePageEventRequestOptions: Joi.function().optional()
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
    throw new Error('Invalid plugin options', result.error)
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.value
}

/**
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 */
