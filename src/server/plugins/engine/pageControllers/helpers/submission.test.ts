import { GeospatialField } from '~/src/server/plugins/engine/components/GeospatialField.js'
import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { validSingleState } from '~/src/server/plugins/engine/components/helpers/__stubs__/geospatial.js'
import { type DetailItemField } from '~/src/server/plugins/engine/models/types.js'
import {
  buildMainRecords,
  buildPaymentRecords,
  buildRepeaterRecords
} from '~/src/server/plugins/engine/pageControllers/helpers/submission.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'

describe('Submission helpers', () => {
  describe('buildPaymentRecords', () => {
    it('should return empty array when no payment state exists', () => {
      const mockPaymentField = Object.create(
        PaymentField.prototype
      ) as PaymentField
      mockPaymentField.getPaymentStateFromState = jest
        .fn()
        .mockReturnValue(undefined)

      const item = {
        name: 'payment',
        label: 'Payment',
        field: mockPaymentField,
        state: {} as FormSubmissionState
      } as unknown as DetailItemField

      const result = buildPaymentRecords(item)

      expect(result).toEqual([])
      expect(mockPaymentField.getPaymentStateFromState).toHaveBeenCalledWith(
        item.state
      )
    })

    it('should return four records when payment state exists', () => {
      const mockPaymentState = {
        paymentId: 'pay_123',
        description: 'Application fee',
        amount: 150,
        reference: 'REF-ABC-123',
        preAuth: {
          status: 'success',
          createdAt: '2026-01-26T14:30:00.000Z'
        }
      }

      const mockPaymentField = Object.create(
        PaymentField.prototype
      ) as PaymentField
      mockPaymentField.getPaymentStateFromState = jest
        .fn()
        .mockReturnValue(mockPaymentState)

      const item = {
        name: 'payment',
        label: 'Payment',
        field: mockPaymentField,
        state: {} as FormSubmissionState
      } as unknown as DetailItemField

      const result = buildPaymentRecords(item)

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({
        name: 'payment_paymentDescription',
        title: 'Payment description',
        value: 'Application fee'
      })
      expect(result[1]).toEqual({
        name: 'payment_paymentAmount',
        title: 'Payment amount',
        value: '£150.00'
      })
      expect(result[2]).toEqual({
        name: 'payment_paymentReference',
        title: 'Payment reference',
        value: 'REF-ABC-123'
      })
      expect(result[3].name).toBe('payment_paymentDate')
      expect(result[3].title).toBe('Payment date')
      // Date will be formatted, just check it's not empty
      expect(result[3].value).not.toBe('')
    })

    it('should return empty date when preAuth.createdAt is missing', () => {
      const mockPaymentState = {
        paymentId: 'pay_123',
        description: 'Application fee',
        amount: 150,
        reference: 'REF-ABC-123',
        preAuth: {
          status: 'success'
          // createdAt is missing
        }
      }

      const mockPaymentField = Object.create(
        PaymentField.prototype
      ) as PaymentField
      mockPaymentField.getPaymentStateFromState = jest
        .fn()
        .mockReturnValue(mockPaymentState)

      const item = {
        name: 'payment',
        label: 'Payment',
        field: mockPaymentField,
        state: {} as FormSubmissionState
      } as unknown as DetailItemField

      const result = buildPaymentRecords(item)

      expect(result[3]).toEqual({
        name: 'payment_paymentDate',
        title: 'Payment date',
        value: ''
      })
    })
  })

  describe('buildMainRecords', () => {
    it('should return empty array for empty items', () => {
      const result = buildMainRecords([])
      expect(result).toEqual([])
    })

    it('should process regular fields correctly', () => {
      const mockTextField = Object.create(TextField.prototype) as TextField
      mockTextField.getDisplayStringFromState = jest
        .fn()
        .mockReturnValue('John Doe')
      mockTextField.getContextValueFromState = jest
        .fn()
        .mockReturnValue('John Doe')

      const items = [
        {
          name: 'fullName',
          label: 'Full name',
          field: mockTextField,
          state: { fullName: 'John Doe' } as FormSubmissionState
        }
      ] as unknown as DetailItemField[]

      const result = buildMainRecords(items)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        name: 'fullName',
        title: 'Full name',
        value: 'John Doe'
      })
    })

    it('should expand PaymentField into four records', () => {
      const mockPaymentState = {
        paymentId: 'pay_123',
        description: 'Licence fee',
        amount: 75.5,
        reference: 'LIC-999',
        preAuth: {
          status: 'success',
          createdAt: '2026-01-26T10:00:00.000Z'
        }
      }

      const mockPaymentField = Object.create(
        PaymentField.prototype
      ) as PaymentField
      mockPaymentField.getPaymentStateFromState = jest
        .fn()
        .mockReturnValue(mockPaymentState)

      const items = [
        {
          name: 'licencePayment',
          label: 'Licence Payment',
          field: mockPaymentField,
          state: {} as FormSubmissionState
        }
      ] as unknown as DetailItemField[]

      const result = buildMainRecords(items)

      expect(result).toHaveLength(4)
      expect(result.map((r) => r.name)).toEqual([
        'licencePayment_paymentDescription',
        'licencePayment_paymentAmount',
        'licencePayment_paymentReference',
        'licencePayment_paymentDate'
      ])
    })

    it('should handle mixed regular and payment fields', () => {
      const mockTextField = Object.create(TextField.prototype) as TextField
      mockTextField.getDisplayStringFromState = jest
        .fn()
        .mockReturnValue('test@example.com')
      mockTextField.getContextValueFromState = jest
        .fn()
        .mockReturnValue('test@example.com')

      const mockPaymentState = {
        paymentId: 'pay_456',
        description: 'Registration fee',
        amount: 25,
        reference: 'REG-001',
        preAuth: { status: 'success', createdAt: '2026-01-26T12:00:00.000Z' }
      }

      const mockPaymentField = Object.create(
        PaymentField.prototype
      ) as PaymentField
      mockPaymentField.getPaymentStateFromState = jest
        .fn()
        .mockReturnValue(mockPaymentState)

      const items = [
        {
          name: 'email',
          label: 'Email address',
          field: mockTextField,
          state: { email: 'test@example.com' } as FormSubmissionState
        },
        {
          name: 'payment',
          label: 'Payment',
          field: mockPaymentField,
          state: {} as FormSubmissionState
        }
      ] as unknown as DetailItemField[]

      const result = buildMainRecords(items)

      // 1 regular field + 4 payment fields = 5 records
      expect(result).toHaveLength(5)
      expect(result[0].name).toBe('email')
      expect(result[1].name).toBe('payment_paymentDescription')
    })

    it('should skip repeater items (items with subItems)', () => {
      const repeaterItem = {
        name: 'addresses',
        label: 'Addresses',
        subItems: [[]]
      }

      const result = buildMainRecords([
        repeaterItem as unknown as DetailItemField
      ])

      expect(result).toEqual([])
    })

    it('should JSON stringify GeospatialField', () => {
      const mockGeospatialField = Object.create(GeospatialField.prototype)
      mockGeospatialField.name = 'geospatial'

      const items = [
        {
          name: 'geospatial',
          label: 'Site features',
          field: mockGeospatialField,
          state: {
            geospatial: validSingleState
          } as FormSubmissionState
        }
      ] as unknown as DetailItemField[]

      const result = buildMainRecords(items)

      expect(result).toHaveLength(1)
      expect(result).toEqual([
        {
          name: 'geospatial',
          title: 'Site features',
          value:
            '[{"type":"Feature","properties":{"description":"My farm house","coordinateGridReference":"ST 00001","centroidGridReference":"ST 00001"},"geometry":{"coordinates":[-2.5723699109417737,53.2380485215034],"type":"Point"},"id":"a"}]'
        }
      ])
    })
  })

  describe('buildRepeaterRecords', () => {
    it('should return empty array when no repeater items', () => {
      const mockField = Object.create(TextField.prototype) as TextField

      const items = [
        {
          name: 'textField',
          label: 'Text',
          field: mockField,
          state: {} as FormSubmissionState
        }
      ]

      const result = buildRepeaterRecords(items as unknown as DetailItemField[])

      expect(result).toEqual([])
    })

    it('should process repeater items correctly', () => {
      const mockSubField = Object.create(TextField.prototype) as TextField
      mockSubField.getDisplayStringFromState = jest
        .fn()
        .mockReturnValue('123 Main St')
      mockSubField.getContextValueFromState = jest
        .fn()
        .mockReturnValue('123 Main St')

      const items = [
        {
          name: 'addresses',
          label: 'Addresses',
          subItems: [
            [
              {
                name: 'street',
                label: 'Street',
                field: mockSubField,
                state: { street: '123 Main St' } as FormSubmissionState
              }
            ]
          ]
        }
      ]

      const result = buildRepeaterRecords(items as unknown as DetailItemField[])

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('addresses')
      expect(result[0].title).toBe('Addresses')
      expect(result[0].value).toHaveLength(1)
    })

    it('should JSON stringify GeospatialField', () => {
      const mockGeospatialField = Object.create(GeospatialField.prototype)
      mockGeospatialField.name = 'geospatial'

      const items = [
        {
          name: 'features',
          label: 'Site features repeater',
          subItems: [
            [
              {
                name: 'geospatial',
                label: 'Site features',
                field: mockGeospatialField,
                state: {
                  geospatial: validSingleState
                } as FormSubmissionState
              } as unknown as DetailItemField[]
            ]
          ]
        }
      ] as unknown as DetailItemField[]

      const result = buildRepeaterRecords(items)

      expect(result).toHaveLength(1)
      expect(result).toEqual([
        {
          name: 'features',
          title: 'Site features repeater',
          value: [
            [
              {
                name: 'geospatial',
                title: 'Site features',
                value:
                  '[{"type":"Feature","properties":{"description":"My farm house","coordinateGridReference":"ST 00001","centroidGridReference":"ST 00001"},"geometry":{"coordinates":[-2.5723699109417737,53.2380485215034],"type":"Point"},"id":"a"}]'
              }
            ]
          ]
        }
      ])
    })
  })
})
