import { FormStatus } from '@defra/forms-model'

import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'
import {
  formAdapterSubmissionMessageDataSchema,
  formAdapterSubmissionMessageMetaSchema,
  formAdapterSubmissionMessagePayloadSchema
} from '~/src/server/plugins/engine/types/schema.js'

describe('Schema validation', () => {
  /** @type {Record<string, RichFormValue>} */
  const main = {
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

  /** @type {Record<string, RichFormValue>} */
  const value1 = {
    IEKzko: 'dsfsdfsdf'
  }
  /** @type {Record<string, RichFormValue>} */
  const value2 = {
    IEKzko: 'dfghfgh'
  }

  /** @type {FormAdapterSubmissionMessageData} */
  const validData = {
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
    /** @type {FormAdapterSubmissionMessageMeta} */
    const validMeta = {
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
    /** @type {FormAdapterSubmissionMessageMeta} */
    const meta = {
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

    /** @type {FormAdapterSubmissionMessagePayload} */
    const validPayload = {
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

  describe('conditionEvaluations', () => {
    /** @type {FormAdapterSubmissionMessageMeta} */
    const meta = {
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

    const result = {
      files: { main: '3d289230-83a3-4852-a68a-cb3569e9b0fe', repeaters: {} }
    }

    const evaluation = {
      conditionId: 'd15aff7a-6224-40a2-8e5f-51a5af2f7910',
      outcome: 'true',
      references: [
        {
          componentId: '87b987e8-bcf9-4ff9-92af-57c34c45995a',
          componentName: 'userName',
          answered: true
        }
      ]
    }

    it('accepts a payload carrying condition evaluations', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate({
        meta,
        data: validData,
        result,
        conditionEvaluations: [evaluation]
      })
      expect(error).toBeUndefined()
    })

    it('accepts an empty list - a V1-engine form has nothing to report', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate({
        meta,
        data: validData,
        result,
        conditionEvaluations: []
      })
      expect(error).toBeUndefined()
    })

    it('accepts a payload without them, keeping older messages valid', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate({
        meta,
        data: validData,
        result
      })
      expect(error).toBeUndefined()
    })

    it('preserves the evaluations under stripUnknown', () => {
      // forms-notify-listener and forms-submission-api both validate with
      // stripUnknown. If the schema did not know about the evaluations they
      // would be silently dropped, and the listener would fall back to
      // resolving recipients from the live definition.
      const { value } = formAdapterSubmissionMessagePayloadSchema.validate(
        { meta, data: validData, result, conditionEvaluations: [evaluation] },
        { stripUnknown: true }
      )
      const validated = /** @type {FormAdapterSubmissionMessagePayload} */ (
        value
      )

      expect(validated.conditionEvaluations).toEqual([evaluation])
    })

    it('rejects a malformed evaluation', () => {
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate({
        meta,
        data: validData,
        result,
        conditionEvaluations: [{ conditionId: 'abc' }]
      })
      expect(error).toBeDefined()
    })
  })
})

/**
 * @import { FormAdapterSubmissionMessageData, FormAdapterSubmissionMessageMeta, FormAdapterSubmissionMessagePayload, RichFormValue } from '~/src/server/plugins/engine/types.js'
 */
