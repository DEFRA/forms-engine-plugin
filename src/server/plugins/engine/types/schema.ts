import {
  FormStatus,
  formVersionMetadataSchema,
  idSchema,
  notificationEmailAddressSchema,
  slugSchema,
  titleSchema
} from '@defra/forms-model'
import Joi from 'joi'

import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'
import {
  type FormAdapterSubmissionMessageData,
  type FormAdapterSubmissionMessageMeta,
  type FormAdapterSubmissionMessagePayload,
  type FormAdapterSubmissionMessageResult
} from '~/src/server/plugins/engine/types.js'

export const formAdapterSubmissionMessageMetaSchema =
  Joi.object<FormAdapterSubmissionMessageMeta>()
    .keys({
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
      notificationEmail: notificationEmailAddressSchema.required(),
      versionMetadata: formVersionMetadataSchema.optional()
    })
    .unknown(true) // Allow custom key/values

export const formAdapterSubmissionMessageDataSchema =
  Joi.object<FormAdapterSubmissionMessageData>().keys({
    main: Joi.object(),
    repeaters: Joi.object(),
    files: Joi.object().pattern(
      Joi.string(),
      Joi.array().items(
        Joi.object().keys({
          fileName: Joi.string().required(),
          fileId: Joi.string().required(),
          userDownloadLink: Joi.string().required()
        })
      )
    )
  })

export const formAdapterSubmissionMessageResultSchema =
  Joi.object<FormAdapterSubmissionMessageResult>().keys({
    files: Joi.object()
      .keys({
        main: Joi.string().required(),
        repeaters: Joi.object()
      })
      .required()
  })

export const formAdapterSubmissionMessagePayloadSchema =
  Joi.object<FormAdapterSubmissionMessagePayload>().keys({
    meta: formAdapterSubmissionMessageMetaSchema.required(),
    data: formAdapterSubmissionMessageDataSchema.required(),
    result: formAdapterSubmissionMessageResultSchema.required()
  })
