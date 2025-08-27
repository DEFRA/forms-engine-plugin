import { FormStatus } from '@defra/forms-model'

import {
  formAdapterSubmissionMessageDataSchema,
  formAdapterSubmissionMessageMetaSchema,
  formAdapterSubmissionMessagePayloadSchema
} from '~/src/server/plugins/engine/types/schema.js'
import {
  FormAdapterSubmissionSchemaVersion,
  type FormAdapterSubmissionMessageData,
  type FormAdapterSubmissionMessageMeta,
  type FormAdapterSubmissionMessagePayload
} from '~/src/server/plugins/engine/types.js'

describe('Schema validation', () => {
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
  })

  describe('formAdapterSubmissionMessageDataSchema', () => {
    const validData: FormAdapterSubmissionMessageData = {
      main: {
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
      },
      repeaters: {},
      files: {}
    }

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
    const validPayload: FormAdapterSubmissionMessagePayload = {
      meta: {
        schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
        timestamp: new Date('2025-08-22T18:15:10.785Z'),
        referenceNumber: '576-225-943',
        formName: 'Order a pizza',
        formId: '68a8b0449ab460290c28940a',
        formSlug: 'order-a-pizza',
        status: FormStatus.Live,
        isPreview: false,
        notificationEmail: 'info@example.com'
      },
      data: {
        main: {
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
        },
        repeaters: {},
        files: {}
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
  })
})
