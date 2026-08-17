import { FormStatus } from '@defra/forms-model'

import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'
import {
  formAdapterSubmissionMessageDataSchema,
  formAdapterSubmissionMessageMetaSchema,
  formAdapterSubmissionMessagePayloadSchema
} from '~/src/server/plugins/engine/types/schema.js'
import {
  type FormAdapterNotificationTarget,
  type FormAdapterNotificationTargetType,
  type FormAdapterSubmissionMessageData,
  type FormAdapterSubmissionMessageMeta,
  type FormAdapterSubmissionMessagePayload,
  type RichFormValue
} from '~/src/server/plugins/engine/types.js'

describe('Schema validation', () => {
  const main: Record<string, RichFormValue> = {
    QMwMir: 'Roman Pizza',
    duOEvZ: 'Small',
    DzEODf: ['Mozzarella'],
    juiCfC: ['Pepperoni', 'Sausage', 'Onions', 'Basil'],
    YEpypP: 'None',
    JumNVc: 'Joe Bloggs',
    ALNehP: '+441234567890',
    vAqTmg: {
      addressLine1: '1 Anywhere Street',
      town: 'Anywhereville',
      postcode: 'AN1 2WH'
    },
    IbXVGY: {
      day: 22,
      month: 8,
      year: 2025
    },
    HGBWLt: ['Garlic sauce']
  }

  const value1: Record<string, RichFormValue> = {
    IEKzko: 'dsfsdfsdf'
  }
  const value2: Record<string, RichFormValue> = {
    IEKzko: 'dfghfgh'
  }

  const validData: FormAdapterSubmissionMessageData = {
    main,
    repeaters: {
      qLVLgb: [value1, value2]
    },
    files: {
      dLzALM: [
        {
          fileId: '489ecc1b-a145-4618-ba5a-b4a0d5ee2dbd',
          fileName: 'file-name.json',
          userDownloadLink:
            'http://localhost:3005/file-download/489ecc1b-a145-4618-ba5a-b4a0d5ee2dbd'
        }
      ]
    }
  }

  describe('formAdapterSubmissionMessageMetaSchema', () => {
    const validMeta: FormAdapterSubmissionMessageMeta = {
      schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
      timestamp: new Date('2025-08-22T18:15:10.785Z'),
      referenceNumber: '576-225-943',
      formName: 'Order a pizza',
      formId: '68a8b0449ab460290c28940a',
      formSlug: 'order-a-pizza',
      status: FormStatus.Live,
      isPreview: false,
      notificationEmail: 'info@example.com'
    }

    it('should validate valid meta object', () => {
      const { error } =
        formAdapterSubmissionMessageMetaSchema.validate(validMeta)
      expect(error).toBeUndefined()
    })

    it('should validate valid meta object with valid custom properties', () => {
      const validMetaWithCustom = {
        ...validMeta,
        custom: {
          property1: 'value 1',
          property2: 'value2'
        }
      }
      const { error } =
        formAdapterSubmissionMessageMetaSchema.validate(validMetaWithCustom)
      expect(error).toBeUndefined()
    })

    it('should validate valid meta object with empty custom properties', () => {
      const validMetaWithCustom = {
        ...validMeta,
        custom: {}
      }
      const { error } =
        formAdapterSubmissionMessageMetaSchema.validate(validMetaWithCustom)
      expect(error).toBeUndefined()
    })

    it('should reject invalid schema version', () => {
      const invalidMeta = { ...validMeta, schemaVersion: 'invalid' }
      const { error } =
        formAdapterSubmissionMessageMetaSchema.validate(invalidMeta)
      expect(error).toBeDefined()
    })

    it('should reject missing required fields', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { timestamp: _, ...metaWithoutTimestamp } = validMeta
      const { error } =
        formAdapterSubmissionMessageMetaSchema.validate(metaWithoutTimestamp)
      expect(error).toBeDefined()
    })

    it('should reject invalid custom structure', () => {
      const validMetaWithInvalidCustom = {
        ...validMeta,
        custom: 'invalid'
      }
      const { error } = formAdapterSubmissionMessageMetaSchema.validate(
        validMetaWithInvalidCustom
      )
      expect(error).toBeDefined()
    })

    it('should validate meta with optional language', () => {
      const { error } = formAdapterSubmissionMessageMetaSchema.validate({
        ...validMeta,
        language: 'cy'
      })
      expect(error).toBeUndefined()
    })

    it('should validate meta without language', () => {
      const { error } =
        formAdapterSubmissionMessageMetaSchema.validate(validMeta)
      expect(error).toBeUndefined()
    })

    it('should reject non-string language', () => {
      const { error } = formAdapterSubmissionMessageMetaSchema.validate({
        ...validMeta,
        language: 123
      })
      expect(error).toBeDefined()
    })
  })

  describe('formAdapterSubmissionMessageDataSchema', () => {
    it('should validate valid data object', () => {
      const { error } =
        formAdapterSubmissionMessageDataSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should validate empty objects', () => {
      const emptyData = { main: {}, repeaters: {}, files: {} }
      const { error } =
        formAdapterSubmissionMessageDataSchema.validate(emptyData)
      expect(error).toBeUndefined()
    })
  })

  describe('formAdapterSubmissionMessagePayloadSchema', () => {
    const meta: FormAdapterSubmissionMessageMeta = {
      schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
      timestamp: new Date('2025-08-22T18:15:10.785Z'),
      referenceNumber: '576-225-943',
      formName: 'Order a pizza',
      formId: '68a8b0449ab460290c28940a',
      formSlug: 'order-a-pizza',
      status: FormStatus.Live,
      isPreview: false,
      notificationEmail: 'info@example.com'
    }

    const validPayload: FormAdapterSubmissionMessagePayload = {
      meta,
      data: validData,
      result: {
        files: {
          main: '3d289230-83a3-4852-a68a-cb3569e9b0fe',
          repeaters: {
            ImxIOP: 'Joe Bloggs'
          }
        }
      }
    }

    it('should validate complete payload', () => {
      const { error } =
        formAdapterSubmissionMessagePayloadSchema.validate(validPayload)
      expect(error).toBeUndefined()
    })

    it('should reject payload without meta', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta: _, ...payloadWithoutMeta } = validPayload
      const { error } =
        formAdapterSubmissionMessagePayloadSchema.validate(payloadWithoutMeta)
      expect(error).toBeDefined()
    })

    it('should reject payload without data', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: _, ...payloadWithoutData } = validPayload
      const { error } =
        formAdapterSubmissionMessagePayloadSchema.validate(payloadWithoutData)
      expect(error).toBeDefined()
    })

    it('should validate payload with versionMetadata', () => {
      const payloadWithVersion = {
        ...validPayload,
        meta: {
          ...validPayload.meta,
          versionMetadata: {
            versionNumber: 19,
            createdAt: new Date('2025-09-08T09:28:15.576Z')
          }
        }
      }
      const { error } =
        formAdapterSubmissionMessagePayloadSchema.validate(payloadWithVersion)
      expect(error).toBeUndefined()
    })

    it('should validate payload without versionMetadata', () => {
      const { error } =
        formAdapterSubmissionMessagePayloadSchema.validate(validPayload)
      expect(error).toBeUndefined()
    })

    it('should reject invalid versionMetadata', () => {
      const payloadWithInvalidVersion = {
        ...validPayload,
        meta: {
          ...validPayload.meta,
          versionMetadata: {
            versionNumber: 'not-a-number', // Invalid - should be number
            createdAt: new Date('2025-09-08T09:28:15.576Z')
          }
        }
      }
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadWithInvalidVersion
      )
      expect(error).toBeDefined()
      expect(error?.message).toContain('must be a number')
    })
  })

  describe('notificationTargets', () => {
    const baseMeta: FormAdapterSubmissionMessageMeta = {
      schemaVersion: FormAdapterSubmissionSchemaVersion.V2,
      timestamp: new Date('2025-08-22T18:15:10.785Z'),
      referenceNumber: '576-225-943',
      formName: 'Order a pizza',
      formId: '68a8b0449ab460290c28940a',
      formSlug: 'order-a-pizza',
      status: FormStatus.Live,
      isPreview: false,
      notificationEmail: 'info@example.com'
    }

    const v1Meta = {
      ...baseMeta,
      schemaVersion: FormAdapterSubmissionSchemaVersion.V1
    }

    const result = {
      files: { main: '3d289230-83a3-4852-a68a-cb3569e9b0fe', repeaters: {} }
    }

    const target: FormAdapterNotificationTarget = {
      emailAddress: 'info@example.com',
      audience: 'human',
      version: '2'
    }

    const payloadV2 = (
      notificationTargets: FormAdapterNotificationTarget[]
    ) => ({ meta: baseMeta, data: validData, result, notificationTargets })

    it('accepts a V2 payload carrying targets', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadV2([target])
      )
      expect(error).toBeUndefined()
    })

    it('accepts an empty target list - a form can resolve to no recipients', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadV2([])
      )
      expect(error).toBeUndefined()
    })

    it('rejects a V2 payload with no targets property at all', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate({
        meta: baseMeta,
        data: validData,
        result
      })
      expect(error).toBeDefined()
      expect(error?.message).toContain('"notificationTargets" is required')
    })

    it('rejects targets on a V1 payload, so an old message cannot carry them', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate({
        meta: v1Meta,
        data: validData,
        result,
        notificationTargets: [target]
      })
      expect(error).toBeDefined()
      expect(error?.message).toContain('"notificationTargets" is not allowed')
    })

    it('accepts a V1 payload without targets, keeping in-flight messages valid', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate({
        meta: v1Meta,
        data: validData,
        result
      })
      expect(error).toBeUndefined()
    })

    it('accepts adapter progress state on a target', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadV2([
          { ...target, type: 'confirmation', sent: true, sendAttempts: 3 }
        ])
      )
      expect(error).toBeUndefined()
    })

    it('preserves progress state under stripUnknown', () => {
      // forms-notify-listener validates with stripUnknown. If the schema did
      // not know about `sent`, it would be silently dropped on redelivery and
      // every requeue would resend to addresses that had already succeeded.
      const { value } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadV2([{ ...target, sent: true, sendAttempts: 2 }]),
        { stripUnknown: true }
      )
      const validated = value as FormAdapterSubmissionMessagePayload

      expect(validated.notificationTargets?.[0]).toEqual({
        ...target,
        sent: true,
        sendAttempts: 2
      })
    })

    it('rejects an unknown target type', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadV2([
          { ...target, type: 'nonsense' as FormAdapterNotificationTargetType }
        ])
      )
      expect(error).toBeDefined()
    })

    it('rejects a target with no email address', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadV2([
          { audience: 'human', version: '2' } as FormAdapterNotificationTarget
        ])
      )
      expect(error).toBeDefined()
    })

    it('rejects a negative send attempt count', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payloadV2([{ ...target, sendAttempts: -1 }])
      )
      expect(error).toBeDefined()
    })
  })
})
