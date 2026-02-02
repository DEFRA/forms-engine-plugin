import {
  ComponentType,
  type FormMetadata,
  type PaymentFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { PaymentPreAuthError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import {
  type FormContext,
  type FormValue
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'
import { get, post, postJson } from '~/src/server/services/httpService.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/httpService.ts')

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
        const result = collection.validate(
          getFormData(payment as unknown as FormValue)
        )

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
        formId: 'formid',
        isLivePayment: false
      }
      it('returns text from state', () => {
        const state1 = getFormState(paymentForState as unknown as FormValue)
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
          formId: 'formid',
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

  describe('dispatcher and onSubmit', () => {
    const def = {
      title: 'Example payment field',
      name: 'myComponent',
      type: ComponentType.PaymentField,
      options: {
        amount: 100,
        description: 'Test payment description'
      }
    } satisfies PaymentFieldComponent

    const collection = new ComponentCollection([def], { model })
    const paymentField = collection.fields[0] as PaymentField

    describe('dispatcher', () => {
      it('should create payment and redirect to gov pay', async () => {
        const mockYarSet = jest.fn()
        const mockRequest = {
          server: {
            plugins: {
              // eslint-disable-next-line no-useless-computed-key
              ['forms-engine-plugin']: {
                baseUrl: 'base-url'
              }
            }
          },
          yar: {
            set: mockYarSet
          }
        } as unknown as FormRequestPayload
        const mockH = {
          redirect: jest
            .fn()
            .mockReturnValueOnce({ code: jest.fn().mockReturnValueOnce('ok') })
        } as unknown as FormResponseToolkit
        const args = {
          controller: {
            model: {
              formId: 'formid',
              basePath: 'base-path',
              name: 'PaymentModel'
            },
            getState: jest
              .fn()
              .mockResolvedValueOnce({ $$__referenceNumber: 'pay-ref-123' })
          },
          component: paymentField,
          sourceUrl: 'http://localhost:3009/test-payment',
          isLive: false,
          isPreview: true
        }
        // @ts-expect-error - partial mock
        jest.mocked(postJson).mockResolvedValueOnce({
          payload: {
            state: {
              status: 'created'
            },
            payment_id: 'new-payment-id',
            _links: {
              next_url: {
                href: '/next-url'
              }
            }
          }
        })

        const res = await PaymentField.dispatcher(mockRequest, mockH, args)
        expect(res).toBe('ok')
        expect(mockYarSet).toHaveBeenCalledWith(expect.any(String), {
          amount: 100,
          componentName: 'myComponent',
          description: 'Test payment description',
          failureUrl: 'http://localhost:3009/test-payment',
          formId: 'formid',
          isLivePayment: false,
          paymentId: 'new-payment-id',
          reference: 'pay-ref-123',
          returnUrl: 'base-url/base-path/summary',
          uuid: expect.any(String)
        })
      })

      it('should redirect to summary if payment is already pre-authorised', async () => {
        const mockRedirectCode = jest.fn().mockReturnValueOnce('redirected')
        const mockH = {
          redirect: jest.fn().mockReturnValueOnce({ code: mockRedirectCode })
        } as unknown as FormResponseToolkit
        const mockRequest = {
          server: {
            plugins: {
              // eslint-disable-next-line no-useless-computed-key
              ['forms-engine-plugin']: {
                baseUrl: 'base-url'
              }
            }
          },
          yar: {
            set: jest.fn()
          }
        } as unknown as FormRequestPayload
        const args = {
          controller: {
            model: {
              formId: 'formid',
              basePath: 'base-path',
              name: 'PaymentModel'
            },
            getState: jest.fn().mockResolvedValueOnce({
              $$__referenceNumber: 'pay-ref-123',
              myComponent: {
                paymentId: 'existing-payment-id',
                amount: 100,
                description: 'Test payment',
                preAuth: {
                  status: 'success',
                  createdAt: '2026-01-29T12:00:00.000Z'
                }
              }
            })
          },
          component: paymentField,
          sourceUrl: 'http://localhost:3009/test-payment',
          isLive: false,
          isPreview: true
        }

        const res = await PaymentField.dispatcher(mockRequest, mockH, args)

        expect(res).toBe('redirected')
        expect(mockH.redirect).toHaveBeenCalledWith(
          'base-url/base-path/summary'
        )
        expect(mockRedirectCode).toHaveBeenCalledWith(303)
        expect(postJson).not.toHaveBeenCalled()
      })
    })

    describe('onSubmit', () => {
      it('should throw if missing state', async () => {
        const mockRequest = {} as unknown as FormRequestPayload

        const error = await paymentField
          .onSubmit(
            mockRequest,
            {} as FormMetadata,
            { state: {} } as FormContext
          )
          .catch((e: unknown) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect((error as PaymentPreAuthError).component).toBe(paymentField)
        expect((error as PaymentPreAuthError).userMessage).toBe(
          'Complete the payment to continue'
        )
      })

      it('should ignore if our state says payment already captured', async () => {
        const mockRequest = {} as unknown as FormRequestPayload

        await paymentField.onSubmit(
          mockRequest,
          {} as FormMetadata,
          {
            state: {
              myComponent: {
                capture: {
                  status: 'success'
                },
                paymentId: 'payment-id',
                amount: 123,
                description: 'Payment desc'
              }
            }
          } as unknown as FormContext
        )
        expect(get).not.toHaveBeenCalled()
        expect(post).not.toHaveBeenCalled()
      })

      it('should mark payment already captured according to gov pay', async () => {
        const mockRequest = {} as unknown as FormRequestPayload
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 100, state: { status: 'success' } }
          })
        await paymentField.onSubmit(
          mockRequest,
          {} as FormMetadata,
          {
            state: {
              myComponent: {
                paymentId: 'payment-id',
                amount: 100,
                description: 'Payment desc',
                isLivePayment: false,
                formId: 'formid'
              }
            }
          } as unknown as FormContext
        )
        expect(get).toHaveBeenCalled()
        expect(post).not.toHaveBeenCalled()
      })

      it('should throw if bad status', async () => {
        const mockRequest = {} as unknown as FormRequestPayload
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 100, state: { status: 'bad' } }
          })
        const error = await paymentField
          .onSubmit(
            mockRequest,
            {} as FormMetadata,
            {
              state: {
                myComponent: {
                  paymentId: 'payment-id',
                  amount: 100,
                  description: 'Payment desc',
                  isLivePayment: false,
                  formId: 'formid'
                }
              }
            } as unknown as FormContext
          )
          .catch((e: unknown) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect((error as PaymentPreAuthError).component).toBe(paymentField)
        expect((error as PaymentPreAuthError).userMessage).toBe(
          'Your payment authorisation has expired. Please add your payment details again.'
        )
      })

      it('should throw if error during capture', async () => {
        const mockRequest = {} as unknown as FormRequestPayload
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 100, state: { status: 'capturable' } }
          })
        // @ts-expect-error - partial mock
        jest.mocked(post).mockResolvedValueOnce({ res: { statusCode: 400 } })
        const error = await paymentField
          .onSubmit(
            mockRequest,
            {} as FormMetadata,
            {
              state: {
                myComponent: {
                  paymentId: 'payment-id',
                  amount: 123,
                  description: 'Payment desc',
                  isLivePayment: false,
                  formId: 'formid'
                }
              }
            } as unknown as FormContext
          )
          .catch((e: unknown) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect((error as PaymentPreAuthError).component).toBe(paymentField)
        expect((error as PaymentPreAuthError).userMessage).toBe(
          'There was a problem and your form was not submitted. Try submitting the form again.'
        )
      })

      it('should throw if amount mismatch', async () => {
        const mockRequest = {} as unknown as FormRequestPayload
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 50, state: { status: 'capturable' } }
          })
        // @ts-expect-error - partial mock
        jest.mocked(post).mockResolvedValueOnce({ res: { statusCode: 200 } })
        const error = await paymentField
          .onSubmit(
            mockRequest,
            {} as FormMetadata,
            {
              state: {
                myComponent: {
                  paymentId: 'payment-id',
                  amount: 123,
                  description: 'Payment desc',
                  isLivePayment: false,
                  formId: 'formid'
                }
              }
            } as unknown as FormContext
          )
          .catch((e: unknown) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect((error as PaymentPreAuthError).component).toBe(paymentField)
        expect((error as PaymentPreAuthError).userMessage).toBe(
          'The pre-authorised payment amount is somehow different from that requested. Try adding payment details again.'
        )
      })

      it('should capture payment if no errors', async () => {
        const mockRequest = {} as unknown as FormRequestPayload
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 100, state: { status: 'capturable' } }
          })
        // @ts-expect-error - partial mock
        jest.mocked(post).mockResolvedValueOnce({ res: { statusCode: 200 } })
        await paymentField.onSubmit(
          mockRequest,
          {} as FormMetadata,
          {
            state: {
              myComponent: {
                paymentId: 'payment-id',
                amount: 123,
                description: 'Payment desc',
                isLivePayment: false,
                formId: 'formid'
              }
            }
          } as unknown as FormContext
        )
        expect(get).toHaveBeenCalled()
        expect(post).toHaveBeenCalled()
      })
    })
  })
})
