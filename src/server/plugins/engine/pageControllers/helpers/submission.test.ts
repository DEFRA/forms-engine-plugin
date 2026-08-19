import { ConditionEvaluationOutcome } from '@defra/forms-model'

import { GeospatialField } from '~/src/server/plugins/engine/components/GeospatialField.js'
import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { validSingleState } from '~/src/server/plugins/engine/components/helpers/__stubs__/geospatial.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItemField } from '~/src/server/plugins/engine/models/types.js'
import {
  buildConditionEvaluations,
  buildMainRecords,
  buildPaymentRecords,
  buildRepeaterRecords
} from '~/src/server/plugins/engine/pageControllers/helpers/submission.js'
import {
  type FormContext,
  type FormState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { definition } from '~/test/fixtures/form.js'
import joinedConditionsDefinition from '~/test/form/definitions/joined-conditions-simple-v2.js'

const translator = new FormModel(definition, {
  basePath: '/'
}).createTranslator()

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

      const result = buildPaymentRecords(item, translator)

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

      const result = buildPaymentRecords(item, translator)

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

      const result = buildPaymentRecords(item, translator)

      expect(result[3]).toEqual({
        name: 'payment_paymentDate',
        title: 'Payment date',
        value: ''
      })
    })
  })

  describe('buildMainRecords', () => {
    it('should return empty array for empty items', () => {
      const result = buildMainRecords([], translator)
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

      const result = buildMainRecords(items, translator)

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

      const result = buildMainRecords(items, translator)

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

      const result = buildMainRecords(items, translator)

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

      const result = buildMainRecords(
        [repeaterItem as unknown as DetailItemField],
        translator
      )

      expect(result).toEqual([])
    })

    it('should JSON stringify GeospatialField', () => {
      const mockGeospatialField = Object.create(
        GeospatialField.prototype
      ) as GeospatialField
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

      const result = buildMainRecords(items, translator)

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

    it('should send empty string for optional GeospatialField', () => {
      const mockGeospatialField = Object.create(
        GeospatialField.prototype
      ) as GeospatialField
      mockGeospatialField.name = 'geospatial'
      mockGeospatialField.options = { required: false }

      const items = [
        {
          name: 'geospatial',
          label: 'Site features',
          field: mockGeospatialField,
          state: {
            geospatial: undefined
          } as FormSubmissionState
        }
      ] as unknown as DetailItemField[]

      const result = buildMainRecords(items, translator)

      expect(result).toHaveLength(1)
      expect(result).toEqual([
        {
          name: 'geospatial',
          title: 'Site features',
          value: ''
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

      const result = buildRepeaterRecords(
        items as unknown as DetailItemField[],
        translator
      )

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

      const result = buildRepeaterRecords(
        items as unknown as DetailItemField[],
        translator
      )

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('addresses')
      expect(result[0].title).toBe('Addresses')
      expect(result[0].value).toHaveLength(1)
    })

    it('should JSON stringify GeospatialField', () => {
      const mockGeospatialField = Object.create(
        GeospatialField.prototype
      ) as GeospatialField
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

      const result = buildRepeaterRecords(items, translator)

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

    it('should send empty string for optional GeospatialField', () => {
      const mockGeospatialField = Object.create(
        GeospatialField.prototype
      ) as GeospatialField
      mockGeospatialField.name = 'geospatial'
      mockGeospatialField.options = { required: false }

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
                  geospatial: undefined
                } as FormSubmissionState
              } as unknown as DetailItemField[]
            ]
          ]
        }
      ] as unknown as DetailItemField[]

      const result = buildRepeaterRecords(items, translator)

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
                value: ''
              }
            ]
          ]
        }
      ])
    })
  })
})

describe('buildConditionEvaluations', () => {
  const userNameComponentId = '87b987e8-bcf9-4ff9-92af-57c34c45995a'
  const isOverEighteenComponentId = 'c977e76e-49ab-4443-b93e-e19e8d9c81ac'
  const isBobConditionId = 'd15aff7a-6224-40a2-8e5f-51a5af2f7910'
  const isOverEighteenConditionId = 'd1f9fcc7-f098-47e7-9d31-4f5ee57ba985'
  const joinedConditionId = 'db43c6bc-9ce6-478b-8345-4fff5eff2ba3'

  const model = new FormModel(joinedConditionsDefinition, { basePath: '/' })

  /**
   * The engine seeds every component with `null` before the page walk, so an
   * unanswered form reaches submission with keys present but empty
   * @param {FormState} evaluationState
   */
  const build = (evaluationState: FormState) =>
    buildConditionEvaluations(model, { evaluationState } as FormContext)

  it('should record every condition in the definition', () => {
    const evaluations = build({ userName: null, isOverEighteen: null })

    expect(evaluations.map((evaluation) => evaluation.conditionId)).toEqual([
      isBobConditionId,
      isOverEighteenConditionId,
      joinedConditionId
    ])
  })

  it('should record answered conditions that match', () => {
    const evaluations = build({ userName: 'Bob', isOverEighteen: true })

    expect(evaluations).toEqual([
      {
        conditionId: isBobConditionId,
        outcome: ConditionEvaluationOutcome.True,
        references: [
          {
            componentId: userNameComponentId,
            componentName: 'userName',
            answered: true
          }
        ]
      },
      {
        conditionId: isOverEighteenConditionId,
        outcome: ConditionEvaluationOutcome.True,
        references: [
          {
            componentId: isOverEighteenComponentId,
            componentName: 'isOverEighteen',
            answered: true
          }
        ]
      },
      {
        conditionId: joinedConditionId,
        outcome: ConditionEvaluationOutcome.True,
        references: [
          {
            componentId: userNameComponentId,
            componentName: 'userName',
            answered: true
          },
          {
            componentId: isOverEighteenComponentId,
            componentName: 'isOverEighteen',
            answered: true
          }
        ]
      }
    ])
  })

  it('should record answered conditions that do not match', () => {
    const evaluations = build({ userName: 'Alice', isOverEighteen: false })

    expect(
      evaluations.map(({ conditionId, outcome }) => ({ conditionId, outcome }))
    ).toEqual([
      {
        conditionId: isBobConditionId,
        outcome: ConditionEvaluationOutcome.False
      },
      {
        conditionId: isOverEighteenConditionId,
        outcome: ConditionEvaluationOutcome.False
      },
      {
        conditionId: joinedConditionId,
        outcome: ConditionEvaluationOutcome.False
      }
    ])
  })

  it('should flag unanswered references so a vacuous outcome can be spotted', () => {
    const evaluations = build({ userName: null, isOverEighteen: null })

    expect(evaluations[0].outcome).toBe(ConditionEvaluationOutcome.False)
    expect(evaluations[0].references).toEqual([
      {
        componentId: userNameComponentId,
        componentName: 'userName',
        answered: false
      }
    ])
  })

  it('should treat an empty answer as unanswered', () => {
    const evaluations = build({ userName: '', isOverEighteen: null })

    expect(evaluations[0].references[0].answered).toBe(false)
  })

  it('should flatten nested condition references to their components', () => {
    const evaluations = build({ userName: 'Bob', isOverEighteen: null })
    const joined = evaluations.find(
      ({ conditionId }) => conditionId === joinedConditionId
    )

    expect(joined?.references).toEqual([
      {
        componentId: userNameComponentId,
        componentName: 'userName',
        answered: true
      },
      {
        componentId: isOverEighteenComponentId,
        componentName: 'isOverEighteen',
        answered: false
      }
    ])
  })

  it('should record an error outcome when evaluation throws', () => {
    // A component missing from the evaluation state - a repeater field, say -
    // throws `undefined variable` rather than evaluating to false
    const evaluations = build({})

    expect(evaluations[0].outcome).toBe(ConditionEvaluationOutcome.Error)
  })

  it('should return no evaluations for a V1 definition', () => {
    const v1Model = new FormModel(definition, { basePath: '/' })

    expect(
      buildConditionEvaluations(v1Model, { evaluationState: {} } as FormContext)
    ).toEqual([])
  })
})
