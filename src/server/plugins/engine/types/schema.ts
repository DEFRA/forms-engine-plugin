import {
  FormStatus,
  formSubmitConditionEvaluationSchema,
  formSubmitNotificationTargetSchema,
  formVersionMetadataSchema,
  idSchema,
  notificationEmailAddressSchema,
  slugSchema,
  titleSchema
} from '@defra/forms-model'
import Joi from 'joi'

import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'
import {
  type FormAdapterNotificationTarget,
  type FormAdapterSubmissionMessageData,
  type FormAdapterSubmissionMessageMeta,
  type FormAdapterSubmissionMessagePayload,
  type FormAdapterSubmissionMessageResult
} from '~/src/server/plugins/engine/types.js'

export const formAdapterSubmissionMessageMetaSchema =
  Joi.object<FormAdapterSubmissionMessageMeta>().keys({
    schemaVersion: Joi.number()
      .valid(
        ...Object.values(FormAdapterSubmissionSchemaVersion).filter(
          (version) => typeof version === 'number'
        )
      )
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

export const formAdapterNotificationTargetSchema: Joi.ObjectSchema<FormAdapterNotificationTarget> =
  formSubmitNotificationTargetSchema.append<FormAdapterNotificationTarget>({
    type: Joi.string()
      .valid('submission', 'confirmation')
      .optional()
      .description('What this target is for. Absent means "submission"'),
    sent: Joi.boolean()
      .optional()
      .description('Whether this address has already been sent to'),
    sendAttempts: Joi.number()
      .integer()
      .min(0)
      .optional()
      .description('Delivery attempts made against this address so far')
  })

export const formAdapterSubmissionMessagePayloadSchema =
  Joi.object<FormAdapterSubmissionMessagePayload>().keys({
    meta: formAdapterSubmissionMessageMetaSchema.required(),
    data: formAdapterSubmissionMessageDataSchema.required(),
    result: formAdapterSubmissionMessageResultSchema.required(),
    notificationTargets: Joi.array()
      .items(formAdapterNotificationTargetSchema)
      .when(Joi.ref('meta.schemaVersion'), {
        is: FormAdapterSubmissionSchemaVersion.V2,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      })
      .description(
        'Addresses to send this submission to, with output conditions already evaluated'
      ),
    conditionEvaluations: Joi.array()
      .items(formSubmitConditionEvaluationSchema)
      .when(Joi.ref('meta.schemaVersion'), {
        is: FormAdapterSubmissionSchemaVersion.V2,
        // Optional even on V2 - only V2 *engine* forms have stable condition
        // ids to report against, and a V2 message can carry a V1-engine form
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      })
      .description(
        'Outcome of every condition in the form definition, evaluated against the final answers at submission'
      )
  })
