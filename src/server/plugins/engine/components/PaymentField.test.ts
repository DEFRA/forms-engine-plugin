import { ComponentType, type PaymentFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormValue } from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('PaymentField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: PaymentFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example payment field',
        name: 'myComponent',
        type: ComponentType.PaymentField,
        options: {
          amount: 100,
          description: 'Test payment description'
        }
      } satisfies PaymentFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses component title as label as default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'Example payment field'
            })
          })
        )
      })

      it('uses component name as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual(['myComponent'])
        expect(field.collection).toBeUndefined()

        for (const key of field.keys) {
          expect(keys).toHaveProperty(key)
        }
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            keys: expect.objectContaining({
              amount: expect.objectContaining({
                flags: expect.objectContaining({
                  presence: 'required'
                })
              })
            })
          })
        )
      })

      it('adds errors for empty value', () => {
        const payment = {
          paymentId: '',
          reference: '',
          amount: 0,
          description: '',
          uuid: '',
          formId: '',
          isLivePayment: false
        }
        const result = collection.validate(getFormData(payment))

        const errors = result.errors ?? []

        expect(errors[0]).toEqual(
          expect.objectContaining({
            text: 'Enter myComponent.paymentId'
          })
        )

        expect(errors[1]).toEqual(
          expect.objectContaining({
            text: 'Enter myComponent.reference'
          })
        )

        expect(errors[2]).toEqual(
          expect.objectContaining({
            text: 'Enter myComponent.description'
          })
        )

        expect(errors[3]).toEqual(
          expect.objectContaining({
            text: 'Enter myComponent.uuid'
          })
        )

        expect(errors[4]).toEqual(
          expect.objectContaining({
            text: 'Enter myComponent.formId'
          })
        )

        expect(errors[5]).toEqual(
          expect.objectContaining({
            text: 'Select myComponent.preAuth'
          })
        )
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData(['invalid']))
        const result2 = collection.validate(
          // @ts-expect-error - Allow invalid param for test
          getFormData({ unknown: 'invalid' })
        )

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      const paymentForState = {
        paymentId: 'payment-id',
        reference: 'payment-ref',
        amount: 150,
        description: 'payment description',
        uuid: 'ee501106-4ce1-4947-91a7-7cc1a335ccd8',
        formId: 'form-id',
        isLivePayment: false
      }
      it('returns text from state', () => {
        const state1 = getFormState(paymentForState)
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('£150.00 - payment description')
        expect(answer2).toBe('')
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData(undefined))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            amount: '100.00',
            attributes: {},
            description: 'Test payment description'
          })
        )
      })

      it('sets Nunjucks component values', () => {
        const paymentForViewModel = {
          paymentId: 'payment-id',
          reference: 'payment-ref',
          uuid: 'ee501106-4ce1-4947-91a7-7cc1a335ccd8',
          formId: 'form-id',
          amount: 100,
          description: 'Test payment description',
          isLivePayment: false
        } as unknown as FormValue
        const viewModel = field.getViewModel(getFormData(paymentForViewModel))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            amount: '100.00',
            attributes: {},
            description: 'Test payment description'
          })
        )
      })
    })

    describe('AllPossibleErrors', () => {
      it('should return errors', () => {
        const errors = field.getAllPossibleErrors()
        expect(errors.baseErrors).not.toBeEmpty()
        expect(errors.advancedSettingsErrors).toBeEmpty()
      })
    })
  })
})
