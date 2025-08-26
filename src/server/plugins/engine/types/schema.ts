import {
  FormStatus,
  idSchema,
  notificationEmailAddressSchema,
  slugSchema,
  titleSchema
} from '@defra/forms-model'
import Joi from 'joi'

import {
  FormAdapterSubmissionSchemaVersion,
  type FormAdapterSubmissionMessageData,
  type FormAdapterSubmissionMessageMeta,
  type FormAdapterSubmissionMessagePayload
} from '~/src/server/plugins/engine/types.js'

export const formAdapterSubmissionMessageMetaSchema =
  Joi.object<FormAdapterSubmissionMessageMeta>().keys({
    schemaVersion: Joi.string().valid(
      ...Object.values(FormAdapterSubmissionSchemaVersion)
    ),
    timestamp: Joi.date().required(),
    referenceNumber: Joi.string().required(),
    formName: titleSchema,
    formId: idSchema,
    formSlug: slugSchema,
    status: Joi.string()
      .valid(...Object.values(FormStatus))
      .required(),
    isPreview: Joi.boolean().required(),
    notificationEmail: notificationEmailAddressSchema.required()
  })

export const formAdapterSubmissionMessageDataSchema =
  Joi.object<FormAdapterSubmissionMessageData>().keys({
    main: Joi.object(),
    repeaters: Joi.object(),
    files: Joi.object()
  })

export const formAdapterSubmissionMessagePayloadSchema =
  Joi.object<FormAdapterSubmissionMessagePayload>().keys({
    meta: formAdapterSubmissionMessageMetaSchema.required(),
    data: formAdapterSubmissionMessageDataSchema.required()
  })
