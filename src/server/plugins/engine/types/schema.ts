import {
  FormStatus,
  formSubmitConditionEvaluationSchema,
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
  Joi.object<FormAdapterSubmissionMessageMeta>().keys({
    schemaVersion: Joi.number()
      .valid(...Object.values(FormAdapterSubmissionSchemaVersion))
      .required(),
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
    versionMetadata: formVersionMetadataSchema.optional(),
    language: Joi.string().optional(),
    custom: Joi.object()
      .pattern(/^/, Joi.any())
      .unknown()
      .optional()
      .description('Custom properties for the message')
  })

export const formAdapterSubmissionMessageDataSchema =
  Joi.object<FormAdapterSubmissionMessageData>().keys({
    main: Joi.object(),
    repeaters: Joi.object(),
    payment: Joi.object()
      .keys({
        paymentId: Joi.string().required(),
        reference: Joi.string().required(),
        amount: Joi.number().required(),
        description: Joi.string().required(),
        descriptionInEng: Joi.string().optional(),
        createdAt: Joi.string().required()
      })
      .optional(),
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
    result: formAdapterSubmissionMessageResultSchema.required(),
    // Optional so that messages published before this existed - which may
    // still be in flight or sitting on a dead-letter queue - continue to
    // validate. Consumers treat its absence as "resolve the recipients from
    // the form definition yourself"
    // This should be required at a later point in time.
    conditionEvaluations: Joi.array()
      .items(formSubmitConditionEvaluationSchema)
      .optional()
      .description(
        'Outcome of every condition in the form definition, evaluated against the final answers at submission'
      )
  })
