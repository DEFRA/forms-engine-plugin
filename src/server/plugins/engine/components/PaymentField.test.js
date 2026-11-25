import { ComponentType } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import { PaymentPreAuthError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import { get, post, postJson } from '~/src/server/services/httpService.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/httpService.js')

const translator = new FormModel(definition, {
  basePath: '/'
}).createTranslator()

const mockRequestBase = /** @type {FormRequestPayload} */ (
  /** @type {unknown} */ ({
    server: {
      plugins: {
        // eslint-disable-next-line no-useless-computed-key
        ['forms-engine-plugin']: {
          baseUrl: 'base-url'
        }
      }
    },
    query: {},
    yar: {
      get: jest.fn(),
      set: jest.fn()
    }
  })
)

const mockServices = /** @type {Services} */ (
  /** @type {unknown} */ ({
    formsService: {
      getFormSecret: () => 'secret-value'
    }
  })
)

describe('PaymentField', () => {
  /** @type {FormModel} */
  let model

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    /** @type {PaymentFieldComponent} */
    let def
    /** @type {ComponentCollection} */
    let collection
    /** @type {Field} */
    let field

    beforeEach(() => {
      def = /** @satisfies {PaymentFieldComponent} */ ({
        title: 'Example payment field',
        name: 'myComponent',
        type: ComponentType.PaymentField,
        options: {
          amount: 100,
          description: 'Test payment description'
        }
      })

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
          getFormData(
            /** @type {FormValue} */ (/** @type {unknown} */ (payment))
          )
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
        const state1 = getFormState(
          /** @type {FormValue} */ (/** @type {unknown} */ (paymentForState))
        )
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1, undefined, translator)
        const answer2 = getAnswer(field, state2, undefined, translator)

        expect(answer1).toBe('£150.00 - payment description')
        expect(answer2).toBe('')
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel({
          payload: getFormData(undefined),
          translator: stubTranslator
        })

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            amount: '£100.00',
            attributes: {},
            description: 'Test payment description'
          })
        )
      })

      it('sets Nunjucks component values', () => {
        const paymentForViewModel = /** @type {FormValue} */ (
          /** @type {unknown} */ ({
            paymentId: 'payment-id',
            reference: 'payment-ref',
            uuid: 'ee501106-4ce1-4947-91a7-7cc1a335ccd8',
            formId: 'formid',
            amount: 100,
            description: 'Test payment description',
            isLivePayment: false
          })
        )
        const viewModel = field.getViewModel({
          payload: getFormData(paymentForViewModel),
          translator: stubTranslator
        })

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            amount: '£100.00',
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
    const def = /** @satisfies {PaymentFieldComponent} */ ({
      title: 'Example payment field',
      name: 'myComponent',
      type: ComponentType.PaymentField,
      options: {
        amount: 100,
        description: 'Test payment description'
      }
    })

    const collection = new ComponentCollection([def], { model })
    const paymentField = /** @type {PaymentField} */ (collection.fields[0])
    paymentField.model = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        services: mockServices,
        createTranslator: (/** @type {string} */ lang) =>
          model.createTranslator(lang)
      })
    )

    describe('dispatcher', () => {
      it('should create payment and redirect to gov pay', async () => {
        const mockYarSet = jest.fn()
        const mockRequest = /** @type {FormRequestPayload} */ (
          /** @type {unknown} */ ({
            ...mockRequestBase,
            yar: {
              set: mockYarSet
            }
          })
        )
        const mockH = /** @type {FormResponseToolkit} */ (
          /** @type {unknown} */ ({
            redirect: jest.fn().mockReturnValueOnce({
              code: jest.fn().mockReturnValueOnce('ok')
            })
          })
        )
        const args = /** @type {PaymentExternalArgs} */ (
          /** @type {unknown} */ ({
            controller: {
              model: {
                formId: 'formid',
                basePath: 'base-path',
                name: 'PaymentModel',
                services: mockServices,
                createTranslator: (/** @type {string} */ lang) =>
                  model.createTranslator(lang),
                getReference: jest.fn().mockReturnValue('pay-ref-123')
              },
              getState: jest
                .fn()
                .mockResolvedValueOnce({ $$__referenceNumber: 'pay-ref-123' })
            },
            component: paymentField,
            sourceUrl: 'http://localhost:3009/test-payment',
            isLive: false,
            isPreview: true
          })
        )
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
          descriptionInEng: 'Test payment description',
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
        const mockH = /** @type {FormResponseToolkit} */ (
          /** @type {unknown} */ ({
            redirect: jest.fn().mockReturnValueOnce({ code: mockRedirectCode })
          })
        )
        const mockRequest = mockRequestBase
        const args = /** @type {PaymentExternalArgs} */ (
          /** @type {unknown} */ ({
            controller: {
              model: {
                formId: 'formid',
                basePath: 'base-path',
                name: 'PaymentModel',
                services: mockServices,
                createTranslator: (/** @type {string} */ lang) =>
                  model.createTranslator(lang),
                getReference: jest.fn().mockReturnValue('pay-ref-123')
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
          })
        )

        const res = await PaymentField.dispatcher(mockRequest, mockH, args)

        expect(res).toBe('redirected')
        expect(mockH.redirect).toHaveBeenCalledWith(
          'base-url/base-path/summary'
        )
        expect(mockRedirectCode).toHaveBeenCalledWith(303)
        expect(postJson).not.toHaveBeenCalled()
      })

      it('should display error if create payment fails (e.g. network or bad api key) - test payment', async () => {
        const mockYarSet = jest.fn()
        const mockYarFlash = jest.fn()
        const mockRequest = /** @type {FormRequestPayload} */ (
          /** @type {unknown} */ ({
            ...mockRequestBase,
            yar: {
              set: mockYarSet,
              flash: mockYarFlash
            },
            url: {
              href: '/here'
            }
          })
        )
        const mockH = /** @type {FormResponseToolkit} */ (
          /** @type {unknown} */ ({
            redirect: jest.fn().mockReturnValueOnce({
              code: jest.fn().mockReturnValueOnce('ok')
            })
          })
        )
        const args = /** @type {PaymentExternalArgs} */ (
          /** @type {unknown} */ ({
            controller: {
              model: {
                formId: 'formid',
                basePath: 'base-path',
                name: 'PaymentModel',
                services: mockServices,
                createTranslator: (/** @type {string} */ lang) =>
                  model.createTranslator(lang),
                getReference: jest.fn().mockReturnValue('pay-ref-123')
              },
              getState: jest
                .fn()
                .mockResolvedValueOnce({ $$__referenceNumber: 'pay-ref-123' })
            },
            component: paymentField,
            sourceUrl: 'http://localhost:3009/test-payment',
            isLive: false,
            isPreview: true
          })
        )
        jest.mocked(postJson).mockImplementationOnce(() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw { output: { statusCode: StatusCodes.UNAUTHORIZED } }
        })

        const res = await PaymentField.dispatcher(mockRequest, mockH, args)
        expect(res).toBe('ok')
        expect(mockYarSet).not.toHaveBeenCalled()
        expect(mockYarFlash).toHaveBeenCalledWith(
          'COMPONENT_STATE_ERROR',
          {
            href: '#myComponent',
            name: 'myComponent',
            text: 'Add a valid test API key before you can preview the payment journey.'
          },
          true
        )
      })

      it('should display error if create payment fails (e.g. network or bad api key) - live payment', async () => {
        const mockYarSet = jest.fn()
        const mockYarFlash = jest.fn()
        const mockRequest = /** @type {FormRequestPayload} */ (
          /** @type {unknown} */ ({
            ...mockRequestBase,
            yar: {
              set: mockYarSet,
              flash: mockYarFlash
            },
            url: {
              href: '/here'
            }
          })
        )
        const mockH = /** @type {FormResponseToolkit} */ (
          /** @type {unknown} */ ({
            redirect: jest.fn().mockReturnValueOnce({
              code: jest.fn().mockReturnValueOnce('ok')
            })
          })
        )
        const args = /** @type {PaymentExternalArgs} */ (
          /** @type {unknown} */ ({
            controller: {
              model: {
                formId: 'formid',
                basePath: 'base-path',
                name: 'PaymentModel',
                services: mockServices,
                createTranslator: (/** @type {string} */ lang) =>
                  model.createTranslator(lang),
                getReference: jest.fn().mockReturnValue('pay-ref-123')
              },
              getState: jest
                .fn()
                .mockResolvedValueOnce({ $$__referenceNumber: 'pay-ref-123' })
            },
            component: paymentField,
            sourceUrl: 'http://localhost:3009/test-payment',
            isLive: true,
            isPreview: false
          })
        )
        jest.mocked(postJson).mockImplementationOnce(() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw { output: { statusCode: StatusCodes.UNAUTHORIZED } }
        })

        const res = await PaymentField.dispatcher(mockRequest, mockH, args)
        expect(res).toBe('ok')
        expect(mockYarSet).not.toHaveBeenCalled()
        expect(mockYarFlash).toHaveBeenCalledWith(
          'COMPONENT_STATE_ERROR',
          {
            href: '#myComponent',
            name: 'myComponent',
            text: 'There is a problem and we cannot take a payment. Contact us (details in the footer of this form) or save your progress and return to the form later.'
          },
          true
        )
      })
    })

    describe('onSubmit', () => {
      it('should throw if missing state', async () => {
        const mockRequest = mockRequestBase

        const error = await paymentField
          .onSubmit(
            mockRequest,
            /** @type {FormMetadata} */ ({}),
            /** @type {FormContext} */ ({ state: {} })
          )
          .catch((/** @type {unknown} */ e) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect(/** @type {PaymentPreAuthError} */ (error).component).toBe(
          paymentField
        )
        expect(/** @type {PaymentPreAuthError} */ (error).userMessage).toBe(
          'Complete the payment to continue'
        )
      })

      it('should ignore if our state says payment already captured', async () => {
        const mockRequest = mockRequestBase

        await paymentField.onSubmit(
          mockRequest,
          /** @type {FormMetadata} */ ({}),
          /** @type {FormContext} */ (
            /** @type {unknown} */ ({
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
            })
          )
        )
        expect(get).not.toHaveBeenCalled()
        expect(post).not.toHaveBeenCalled()
      })

      it('should mark payment already captured according to gov pay', async () => {
        const mockRequest = mockRequestBase
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 10000, state: { status: 'success' } }
          })
        await paymentField.onSubmit(
          mockRequest,
          /** @type {FormMetadata} */ ({}),
          /** @type {FormContext} */ (
            /** @type {unknown} */ ({
              state: {
                myComponent: {
                  paymentId: 'payment-id',
                  amount: 100,
                  description: 'Payment desc',
                  isLivePayment: false,
                  formId: 'formid'
                }
              }
            })
          )
        )
        expect(get).toHaveBeenCalled()
        expect(post).not.toHaveBeenCalled()
      })

      it('should throw if bad status', async () => {
        const mockRequest = mockRequestBase
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 10000, state: { status: 'bad' } }
          })
        const error = await paymentField
          .onSubmit(
            mockRequest,
            /** @type {FormMetadata} */ ({}),
            /** @type {FormContext} */ (
              /** @type {unknown} */ ({
                state: {
                  myComponent: {
                    paymentId: 'payment-id',
                    amount: 100,
                    description: 'Payment desc',
                    isLivePayment: false,
                    formId: 'formid'
                  }
                }
              })
            )
          )
          .catch((/** @type {unknown} */ e) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect(/** @type {PaymentPreAuthError} */ (error).component).toBe(
          paymentField
        )
        expect(/** @type {PaymentPreAuthError} */ (error).userMessage).toBe(
          'Your payment authorisation has expired. Please add your payment details again.'
        )
      })

      it('should throw if error during capture', async () => {
        const mockRequest = mockRequestBase
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 10000, state: { status: 'capturable' } }
          })
        // @ts-expect-error - partial mock
        jest.mocked(post).mockResolvedValueOnce({ res: { statusCode: 400 } })
        const error = await paymentField
          .onSubmit(
            mockRequest,
            /** @type {FormMetadata} */ ({}),
            /** @type {FormContext} */ (
              /** @type {unknown} */ ({
                state: {
                  myComponent: {
                    paymentId: 'payment-id',
                    amount: 123,
                    description: 'Payment desc',
                    isLivePayment: false,
                    formId: 'formid'
                  }
                }
              })
            )
          )
          .catch((/** @type {unknown} */ e) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect(/** @type {PaymentPreAuthError} */ (error).component).toBe(
          paymentField
        )
        expect(/** @type {PaymentPreAuthError} */ (error).userMessage).toBe(
          'There was a problem and your form was not submitted. Try submitting the form again.'
        )
      })

      it('should throw if amount mismatch', async () => {
        const mockRequest = mockRequestBase
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 5000, state: { status: 'capturable' } }
          })
        // @ts-expect-error - partial mock
        jest.mocked(post).mockResolvedValueOnce({ res: { statusCode: 200 } })
        const error = await paymentField
          .onSubmit(
            mockRequest,
            /** @type {FormMetadata} */ ({}),
            /** @type {FormContext} */ (
              /** @type {unknown} */ ({
                state: {
                  myComponent: {
                    paymentId: 'payment-id',
                    amount: 123,
                    description: 'Payment desc',
                    isLivePayment: false,
                    formId: 'formid'
                  }
                }
              })
            )
          )
          .catch((/** @type {unknown} */ e) => e)

        expect(error).toBeInstanceOf(PaymentPreAuthError)
        expect(/** @type {PaymentPreAuthError} */ (error).component).toBe(
          paymentField
        )
        expect(/** @type {PaymentPreAuthError} */ (error).userMessage).toBe(
          'The pre-authorised payment amount is somehow different from that requested. Try adding payment details again.'
        )
      })

      it('should capture payment if no errors', async () => {
        const mockRequest = mockRequestBase
        jest
          .mocked(get)
          // @ts-expect-error - partial mock
          .mockResolvedValueOnce({
            payload: { amount: 10000, state: { status: 'capturable' } }
          })
        // @ts-expect-error - partial mock
        jest.mocked(post).mockResolvedValueOnce({ res: { statusCode: 200 } })
        await paymentField.onSubmit(
          mockRequest,
          /** @type {FormMetadata} */ ({}),
          /** @type {FormContext} */ (
            /** @type {unknown} */ ({
              state: {
                myComponent: {
                  paymentId: 'payment-id',
                  amount: 123,
                  description: 'Payment desc',
                  isLivePayment: false,
                  formId: 'formid'
                }
              }
            })
          )
        )
        expect(get).toHaveBeenCalled()
        expect(post).toHaveBeenCalled()
      })
    })

    describe('getFormValue', () => {
      it('should return undefined', () => {
        expect(paymentField.getFormValue({})).toBeUndefined()
      })
      it('should return value', () => {
        const payment = {
          paymentId: 'payment-id',
          amount: 123,
          description: 'Payment desc',
          isLivePayment: false,
          formId: 'formid'
        }
        expect(paymentField.getFormValue(payment)).toEqual(payment)
      })
    })

    describe('isState', () => {
      it('should return false if not valid state', () => {
        expect(paymentField.isState({})).toBe(false)
      })
      it('should return value', () => {
        const payment = {
          paymentId: 'payment-id',
          amount: 123,
          description: 'Payment desc',
          isLivePayment: false,
          formId: 'formid'
        }
        expect(paymentField.isState(payment)).toBe(true)
      })
    })
  })

  describe('resolveAmount', () => {
    const baseOptions = /** @satisfies {PaymentFieldComponent['options']} */ ({
      amount: 50,
      description: 'Test payment'
    })

    const mockState = /** @type {FormState} */ ({})

    /**
     * @param {Record<string, boolean>} conditionResults
     * @returns {FormModel}
     */
    function createMockModel(conditionResults) {
      /** @type {Record<string, { fn: (s: FormState) => boolean }>} */
      const conditions = {}
      for (const [key, value] of Object.entries(conditionResults)) {
        conditions[key] = { fn: () => value }
      }
      return /** @type {FormModel} */ (/** @type {unknown} */ ({ conditions }))
    }

    it('should return default amount when no conditionalAmounts', () => {
      const mockModel = createMockModel({})
      const result = PaymentField.resolveAmount(
        baseOptions,
        mockModel,
        mockState
      )
      expect(result).toBe(50)
    })

    it('should return default amount when conditionalAmounts is empty', () => {
      const mockModel = createMockModel({})
      const options = { ...baseOptions, conditionalAmounts: [] }
      const result = PaymentField.resolveAmount(options, mockModel, mockState)
      expect(result).toBe(50)
    })

    it('should return first matching condition amount', () => {
      const mockModel = createMockModel({ 'cond-a': true, 'cond-b': false })
      const options = {
        ...baseOptions,
        conditionalAmounts: [
          { condition: 'cond-a', amount: 100 },
          { condition: 'cond-b', amount: 200 }
        ]
      }
      const result = PaymentField.resolveAmount(options, mockModel, mockState)
      expect(result).toBe(100)
    })

    it('should return second condition when first is false', () => {
      const mockModel = createMockModel({ 'cond-a': true, 'cond-b': false })
      const options = {
        ...baseOptions,
        conditionalAmounts: [
          { condition: 'cond-b', amount: 200 },
          { condition: 'cond-a', amount: 100 }
        ]
      }
      const result = PaymentField.resolveAmount(options, mockModel, mockState)
      expect(result).toBe(100)
    })

    it('should return default when no conditions match', () => {
      const mockModel = createMockModel({ 'cond-b': false })
      const options = {
        ...baseOptions,
        conditionalAmounts: [{ condition: 'cond-b', amount: 200 }]
      }
      const result = PaymentField.resolveAmount(options, mockModel, mockState)
      expect(result).toBe(50)
    })

    it('should skip missing condition IDs gracefully', () => {
      const mockModel = createMockModel({ 'cond-a': true })
      const options = {
        ...baseOptions,
        conditionalAmounts: [
          { condition: 'nonexistent', amount: 999 },
          { condition: 'cond-a', amount: 100 }
        ]
      }
      const result = PaymentField.resolveAmount(options, mockModel, mockState)
      expect(result).toBe(100)
    })

    it('should return 0 when condition resolves to zero amount', () => {
      const mockModel = createMockModel({ 'cond-zero': true })
      const options = {
        ...baseOptions,
        conditionalAmounts: [{ condition: 'cond-zero', amount: 0 }]
      }
      const result = PaymentField.resolveAmount(options, mockModel, mockState)
      expect(result).toBe(0)
    })
  })

  describe('dispatcher with conditional amounts', () => {
    const def = /** @satisfies {PaymentFieldComponent} */ ({
      title: 'Conditional payment',
      name: 'myPayment',
      type: ComponentType.PaymentField,
      options: {
        amount: 50,
        description: 'Test payment',
        conditionalAmounts: [{ condition: 'cond-zero', amount: 0 }]
      }
    })

    it('should redirect to summary when resolved amount is 0', async () => {
      const mockRedirectCode = jest.fn().mockReturnValueOnce('redirected')
      const mockH = /** @type {FormResponseToolkit} */ (
        /** @type {unknown} */ ({
          redirect: jest.fn().mockReturnValueOnce({ code: mockRedirectCode })
        })
      )
      const mockRequest = mockRequestBase
      const args = /** @type {PaymentExternalArgs} */ (
        /** @type {unknown} */ ({
          controller: {
            model: {
              formId: 'formid',
              basePath: 'base-path',
              services: mockServices,
              conditions: {
                'cond-zero': { fn: () => true }
              },
              createTranslator: (/** @type {string} */ lang) =>
                model.createTranslator(lang),
              getReference: jest.fn().mockReturnValue('ref-123')
            },
            getState: jest.fn().mockResolvedValueOnce({
              $$__referenceNumber: 'ref-123'
            })
          },
          component: def,
          sourceUrl: 'http://localhost:3009/test',
          isLive: false,
          isPreview: true
        })
      )

      const res = await PaymentField.dispatcher(mockRequest, mockH, args)
      expect(res).toBe('redirected')
      expect(mockH.redirect).toHaveBeenCalledWith('base-url/base-path/summary')
      expect(postJson).not.toHaveBeenCalled()
    })

    it('should use resolved amount when creating payment', async () => {
      const mockYarSet = jest.fn()
      const mockRequest = /** @type {FormRequestPayload} */ (
        /** @type {unknown} */ ({
          ...mockRequestBase,
          yar: { set: mockYarSet }
        })
      )
      const mockH = /** @type {FormResponseToolkit} */ (
        /** @type {unknown} */ ({
          redirect: jest
            .fn()
            .mockReturnValueOnce({ code: jest.fn().mockReturnValueOnce('ok') })
        })
      )

      const condDef = {
        ...def,
        options: {
          ...def.options,
          conditionalAmounts: [{ condition: 'cond-100', amount: 100 }]
        }
      }

      const args = /** @type {PaymentExternalArgs} */ (
        /** @type {unknown} */ ({
          controller: {
            model: {
              formId: 'formid',
              basePath: 'base-path',
              services: mockServices,
              conditions: {
                'cond-100': { fn: () => true }
              },
              createTranslator: (/** @type {string} */ lang) =>
                model.createTranslator(lang),
              getReference: jest.fn().mockReturnValue('ref-123')
            },
            getState: jest.fn().mockResolvedValueOnce({
              $$__referenceNumber: 'ref-123'
            })
          },
          component: condDef,
          sourceUrl: 'http://localhost:3009/test',
          isLive: false,
          isPreview: true
        })
      )

      // @ts-expect-error - partial mock
      jest.mocked(postJson).mockResolvedValueOnce({
        payload: {
          state: { status: 'created' },
          payment_id: 'pay-id',
          _links: { next_url: { href: '/next' } }
        }
      })

      await PaymentField.dispatcher(mockRequest, mockH, args)
      expect(mockYarSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ amount: 100 })
      )
    })
  })

  describe('dispatcher with email prepopulation', () => {
    it('should pass state.userConfirmationEmailAddress to createPayment', async () => {
      const def = /** @satisfies {PaymentFieldComponent} */ ({
        title: 'Payment',
        name: 'myPayment',
        type: ComponentType.PaymentField,
        options: {
          amount: 50,
          description: 'Test payment'
        }
      })

      const mockRequest = mockRequestBase
      const mockH = /** @type {FormResponseToolkit} */ (
        /** @type {unknown} */ ({
          redirect: jest
            .fn()
            .mockReturnValueOnce({ code: jest.fn().mockReturnValueOnce('ok') })
        })
      )
      const args = /** @type {PaymentExternalArgs} */ (
        /** @type {unknown} */ ({
          controller: {
            model: {
              formId: 'formid',
              basePath: 'base-path',
              services: mockServices,
              conditions: {},
              createTranslator: (/** @type {string} */ lang) =>
                model.createTranslator(lang),
              getReference: jest.fn().mockReturnValue('ref-123')
            },
            getState: jest.fn().mockResolvedValueOnce({
              $$__referenceNumber: 'ref-123',
              userConfirmationEmailAddress: 'cya@example.com'
            })
          },
          component: def,
          sourceUrl: 'http://localhost:3009/test',
          isLive: false,
          isPreview: true
        })
      )

      // @ts-expect-error - partial mock
      jest.mocked(postJson).mockResolvedValueOnce({
        payload: {
          state: { status: 'created' },
          payment_id: 'pay-id',
          _links: { next_url: { href: '/next' } }
        }
      })

      await PaymentField.dispatcher(mockRequest, mockH, args)

      expect(postJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: expect.objectContaining({
            email: 'cya@example.com'
          })
        })
      )
    })

    it('should not pass email when state.userConfirmationEmailAddress is missing', async () => {
      const def = /** @satisfies {PaymentFieldComponent} */ ({
        title: 'Payment',
        name: 'myPayment',
        type: ComponentType.PaymentField,
        options: {
          amount: 50,
          description: 'Test payment'
        }
      })

      const mockRequest = mockRequestBase
      const mockH = /** @type {FormResponseToolkit} */ (
        /** @type {unknown} */ ({
          redirect: jest
            .fn()
            .mockReturnValueOnce({ code: jest.fn().mockReturnValueOnce('ok') })
        })
      )
      const args = /** @type {PaymentExternalArgs} */ (
        /** @type {unknown} */ ({
          controller: {
            model: {
              formId: 'formid',
              basePath: 'base-path',
              services: mockServices,
              conditions: {},
              createTranslator: (/** @type {string} */ lang) =>
                model.createTranslator(lang),
              getReference: jest.fn().mockReturnValue('ref-123')
            },
            getState: jest.fn().mockResolvedValueOnce({
              $$__referenceNumber: 'ref-123'
            })
          },
          component: def,
          sourceUrl: 'http://localhost:3009/test',
          isLive: false,
          isPreview: true
        })
      )

      // @ts-expect-error - partial mock
      jest.mocked(postJson).mockResolvedValueOnce({
        payload: {
          state: { status: 'created' },
          payment_id: 'pay-id',
          _links: { next_url: { href: '/next' } }
        }
      })

      await PaymentField.dispatcher(mockRequest, mockH, args)

      expect(postJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: expect.not.objectContaining({
            email: expect.anything()
          })
        })
      )
    })

    it('should not pass email when state.userConfirmationEmailAddress is not a string', async () => {
      const def = /** @satisfies {PaymentFieldComponent} */ ({
        title: 'Payment',
        name: 'myPayment',
        type: ComponentType.PaymentField,
        options: {
          amount: 50,
          description: 'Test payment'
        }
      })

      const mockRequest = mockRequestBase
      const mockH = /** @type {FormResponseToolkit} */ (
        /** @type {unknown} */ ({
          redirect: jest
            .fn()
            .mockReturnValueOnce({ code: jest.fn().mockReturnValueOnce('ok') })
        })
      )
      const args = /** @type {PaymentExternalArgs} */ (
        /** @type {unknown} */ ({
          controller: {
            model: {
              formId: 'formid',
              basePath: 'base-path',
              services: mockServices,
              conditions: {},
              createTranslator: (/** @type {string} */ lang) =>
                model.createTranslator(lang),
              getReference: jest.fn().mockReturnValue('ref-123')
            },
            getState: jest.fn().mockResolvedValueOnce({
              $$__referenceNumber: 'ref-123',
              userConfirmationEmailAddress: { not: 'a string' }
            })
          },
          component: def,
          sourceUrl: 'http://localhost:3009/test',
          isLive: false,
          isPreview: true
        })
      )

      // @ts-expect-error - partial mock
      jest.mocked(postJson).mockResolvedValueOnce({
        payload: {
          state: { status: 'created' },
          payment_id: 'pay-id',
          _links: { next_url: { href: '/next' } }
        }
      })

      await PaymentField.dispatcher(mockRequest, mockH, args)

      expect(postJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: expect.not.objectContaining({
            email: expect.anything()
          })
        })
      )
    })
  })

  describe('onSubmit with conditional amounts', () => {
    const def = /** @satisfies {PaymentFieldComponent} */ ({
      title: 'Payment',
      name: 'myComponent',
      type: ComponentType.PaymentField,
      options: {
        amount: 0,
        description: 'Test payment',
        conditionalAmounts: []
      }
    })

    const collection = new ComponentCollection([def], { model })
    const paymentField = /** @type {PaymentField} */ (collection.fields[0])
    paymentField.model = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        services: mockServices,
        conditions: {},
        createTranslator: (/** @type {string} */ lang) =>
          model.createTranslator(lang)
      })
    )

    it('should return early when resolved amount is 0', async () => {
      const mockRequest = mockRequestBase

      await paymentField.onSubmit(
        mockRequest,
        /** @type {FormMetadata} */ ({}),
        /** @type {FormContext} */ (
          /** @type {unknown} */ ({
            state: {}
          })
        )
      )

      expect(get).not.toHaveBeenCalled()
      expect(post).not.toHaveBeenCalled()
    })
  })
})

/**
 * @import { FormMetadata, PaymentFieldComponent } from '@defra/forms-model'
 * @import { Field } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { FormContext, FormState, FormValue, PaymentExternalArgs } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 * @import { Services } from '~/src/server/types.js'
 */
