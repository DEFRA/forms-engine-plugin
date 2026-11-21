import Joi from 'joi'

import { FormAction, FormStatus } from '~/src/server/routes/types.js'

export const stateSchema = /** @type {StringSchema<FormStatus>} */ (
  Joi.string()
)
  .valid(FormStatus.Draft, FormStatus.Live)
  .required()

export const actionSchema = /** @type {StringSchema<FormAction>} */ (
  Joi.string()
)
  .pattern(new RegExp(`^${FormAction.External}-[a-zA-Z-:]*$`))
  .allow(
    ...Object.values(FormAction).filter(
      (value) => value !== FormAction.External
    )
  )
  .default(FormAction.Validate)
  .optional()

export const pathSchema = Joi.string().required()
export const itemIdSchema = Joi.string().uuid().required()
export const crumbSchema = Joi.string().optional().allow('')
export const confirmSchema = Joi.boolean().empty(false)

export const paramsSchema = /** @type {ObjectSchema<FormPayloadParams>} */ (
  Joi.object()
)
  .keys({
    action: actionSchema,
    confirm: confirmSchema,
    crumb: crumbSchema,
    itemId: itemIdSchema.optional()
  })
  .default({})
  .optional()

/**
 * @import { ObjectSchema, StringSchema } from 'joi'
 * @import { FormPayloadParams } from '~/src/server/plugins/engine/types.js'
 */
