import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  SummaryPageController,
  submitForm
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import definition from '~/test/form/definitions/basic.js'
import definitionPaymentV2Conditional from '~/test/form/definitions/payment-v2-conditional.js'

const translator = new FormModel(definition, {
  basePath: '/'
}).createTranslator()

// Note - the form must have at least one Welsh translation otherwise the translator defaults back to English
const welshTranslator = new FormModel(
  {
    ...definition,
    metadata: {
      translations: {
        cy: {
          dummy: 'Some welsh'
        }
      }
    }
  },
  {
    basePath: '/'
  }
).createTranslator('cy')

describe('SummaryPageController', () => {
  /** @type {FormModel} */
  let model
  /** @type {SummaryPageController} */
  let controller
  /** @type {FormRequest} */
  let requestPage

  const response = {
    code: jest.fn().mockImplementation(() => response)
  }
  /** @type {FormResponseToolkit} */
  const h = {
    redirect: jest.fn().mockReturnValue(response),
    view: jest.fn(),
    continue: Symbol('continue')
  }

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    // Create a mock page for SummaryPageController
    const mockPage = {
      ...definition.pages[0],
      controller: 'summary'
    }

    controller = new SummaryPageController(model, /** @type {any} */ (mockPage))

    requestPage = buildFormRequest(
      /** @type {FormRequest} */ ({
        method: 'get',
        url: new URL('http://example.com/test/summary'),
        path: '/test/summary',
        params: {
          path: 'summary',
          slug: 'test'
        },
        query: {},
        app: { model }
      })
    )
  })

  describe('handleSaveAndExit', () => {
    it('should invoke saveAndExit plugin option', async () => {
      const saveAndExitMock = jest.fn(() => ({}))
      /** @type {FormSubmissionState} */
      const state = {
        $$__referenceNumber: 'foobar',
        licenceLength: 365,
        fullName: 'John Smith'
      }
      const request = /** @type {FormRequestPayload} */ (
        /** @type {unknown} */ ({
          ...requestPage,
          server: {
            plugins: {
              'forms-engine-plugin': {
                saveAndExit: saveAndExitMock,
                cacheService: /** @type {CacheService} */ (
                  /** @type {unknown} */ ({
                    clearState: jest.fn()
                  })
                )
              }
            }
          },
          method: 'post',
          payload: { fullName: 'John Smith', action: 'save-and-exit' }
        })
      )

      const context = model.getFormContext(request, state)

      const postHandler = controller.makePostRouteHandler()
      await postHandler(request, context, h)

      expect(saveAndExitMock).toHaveBeenCalledWith(request, h, context)
    })
  })

  // Note: InvalidComponentStateError handling is comprehensively tested
  // in the integration test: test/form/component-state-errors.test.js

  describe('per-request translator in makeGetRouteHandler', () => {
    it('should create a per-request translator and pass t to the view', async () => {
      /** @type {Translator} */
      const mockTranslator = {
        t: jest.fn().mockReturnValue('translated'),
        tPage: /** @type {Translator['tPage']} */ (
          jest.fn().mockReturnValue('content')
        ),
        tComponent: /** @type {Translator['tComponent']} */ (
          jest.fn().mockReturnValue('content')
        ),
        tSection: /** @type {Translator['tSection']} */ (
          jest.fn().mockReturnValue('content')
        ),
        tListItem: /** @type {Translator['tListItem']} */ (
          jest.fn().mockReturnValue('content')
        ),
        tForm: /** @type {Translator['tForm']} */ (
          jest.fn().mockReturnValue('content')
        ),
        language: 'en-GB'
      }

      const createTranslatorSpy = jest
        .spyOn(model, 'createTranslator')
        .mockReturnValue(mockTranslator)

      // Mock model.services.formsService so hasMissingNotificationEmail does not throw
      jest
        .spyOn(model.services.formsService, 'getFormMetadata')
        .mockResolvedValue(
          /** @type {never} */ ({ notificationEmail: 'test@test.com' })
        )

      /** @type {FormSubmissionState} */
      const state = {
        $$__referenceNumber: 'foobar',
        licenceLength: 365,
        fullName: 'John Smith'
      }

      const context = model.getFormContext(requestPage, state)

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(requestPage, context, h)

      expect(createTranslatorSpy).toHaveBeenCalledWith('en-GB')
      expect(h.view).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ t: mockTranslator.t })
      )
    })
  })
})

describe('SummaryPageController - Payment (DF-832)', () => {
  /** @type {FormModel} */
  let model
  /** @type {SummaryPageController} */
  let controller
  /** @type {FormRequest} */
  let requestPage

  const response = {
    code: jest.fn().mockImplementation(() => response)
  }
  /** @type {FormResponseToolkit} */
  const h = {
    redirect: jest.fn().mockReturnValue(response),
    view: jest.fn(),
    continue: Symbol('continue')
  }

  beforeEach(() => {
    model = new FormModel(definitionPaymentV2Conditional, {
      basePath: 'test'
    })

    controller = /** @type {SummaryPageController} */ (
      model.pages.find((p) => p.path === '/summary')
    )

    requestPage = buildFormRequest(
      /** @type {FormRequest} */ ({
        method: 'get',
        url: new URL('http://example.com/test/summary'),
        path: '/test/summary',
        params: {
          path: 'summary',
          slug: 'test'
        },
        query: {},
        app: { model }
      })
    )
  })

  describe('GET handler: paymentComplete=true', () => {
    it('auto-submits without going through reconcile/view when paymentComplete=true', async () => {
      /** @type {FormSubmissionState} */
      const state = {
        $$__referenceNumber: 'foobar',
        yesNoField: false
      }
      const request = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          ...requestPage,
          query: { paymentComplete: 'true' }
        })
      )

      const context = model.getFormContext(request, state)

      const handleFormSubmitSpy = jest
        .spyOn(controller, 'handleFormSubmit')
        .mockResolvedValue(
          /** @type {ReturnType<typeof controller.handleFormSubmit>} */ (
            /** @type {unknown} */ (undefined)
          )
        )

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(request, context, h)

      expect(handleFormSubmitSpy).toHaveBeenCalledTimes(1)
      // The GET handler should short-circuit before rendering the view
      expect(h.view).not.toHaveBeenCalled()
    })

    it('follows the normal CYA render path when paymentComplete is absent', async () => {
      const cacheService = /** @type {CacheService} */ (
        /** @type {unknown} */ ({
          resetComponentStates: jest.fn()
        })
      )

      /** @type {FormSubmissionState} */
      const state = {
        $$__referenceNumber: 'foobar',
        yesNoField: false
      }
      const request = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          ...requestPage,
          server: {
            plugins: {
              'forms-engine-plugin': { cacheService }
            }
          }
        })
      )

      const context = model.getFormContext(request, state)

      jest
        .spyOn(controller, 'handleFormSubmit')
        .mockResolvedValue(
          /** @type {ReturnType<typeof controller.handleFormSubmit>} */ (
            /** @type {unknown} */ (undefined)
          )
        )
      // Avoid hitting hasMissingNotificationEmail's real implementation
      jest
        .spyOn(
          /** @type {{ hasMissingNotificationEmail: () => Promise<boolean> }} */ (
            /** @type {unknown} */ (controller)
          ),
          'hasMissingNotificationEmail'
        )
        .mockResolvedValue(false)

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(request, context, h)

      expect(controller.handleFormSubmit).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledTimes(1)
    })
  })

  describe('reconcilePaymentState', () => {
    it('resets payment component state when resolved amount has changed since pre-auth', async () => {
      const cacheService = /** @type {CacheService} */ (
        /** @type {unknown} */ ({
          resetComponentStates: jest.fn().mockResolvedValue(undefined)
        })
      )

      // yesNoField=false resolves to £99 (see fixture), but the stored
      // pre-auth is at £50 (the base amount). This mismatch should
      // trigger a reset of paymentField's stored state.
      /** @type {FormSubmissionState} */
      const state = /** @type {FormSubmissionState} */ (
        /** @type {unknown} */ ({
          $$__referenceNumber: 'foobar',
          yesNoField: false,
          paymentField: {
            paymentId: 'stale-id',
            amount: 50,
            description: 'Test payment',
            preAuth: { status: 'success' }
          }
        })
      )

      const request = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          ...requestPage,
          server: {
            plugins: {
              'forms-engine-plugin': { cacheService }
            }
          }
        })
      )

      const context = model.getFormContext(request, state)

      jest
        .spyOn(
          /** @type {{ hasMissingNotificationEmail: () => Promise<boolean> }} */ (
            /** @type {unknown} */ (controller)
          ),
          'hasMissingNotificationEmail'
        )
        .mockResolvedValue(false)

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(request, context, h)

      expect(cacheService.resetComponentStates).toHaveBeenCalledWith(request, [
        'paymentField'
      ])
    })

    it('does not reset payment state when stored amount matches resolved amount', async () => {
      const cacheService = /** @type {CacheService} */ (
        /** @type {unknown} */ ({
          resetComponentStates: jest.fn()
        })
      )

      // yesNoField=false resolves to £99; stored pre-auth also at £99.
      /** @type {FormSubmissionState} */
      const state = /** @type {FormSubmissionState} */ (
        /** @type {unknown} */ ({
          $$__referenceNumber: 'foobar',
          yesNoField: false,
          paymentField: {
            paymentId: 'fresh-id',
            amount: 99,
            description: 'Test payment',
            preAuth: { status: 'success' }
          }
        })
      )

      const request = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          ...requestPage,
          server: {
            plugins: {
              'forms-engine-plugin': { cacheService }
            }
          }
        })
      )

      const context = model.getFormContext(request, state)

      jest
        .spyOn(
          /** @type {{ hasMissingNotificationEmail: () => Promise<boolean> }} */ (
            /** @type {unknown} */ (controller)
          ),
          'hasMissingNotificationEmail'
        )
        .mockResolvedValue(false)

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(request, context, h)

      expect(cacheService.resetComponentStates).not.toHaveBeenCalled()
    })

    it('does nothing when no paymentState is stored yet', async () => {
      const cacheService = /** @type {CacheService} */ (
        /** @type {unknown} */ ({
          resetComponentStates: jest.fn()
        })
      )

      /** @type {FormSubmissionState} */
      const state = {
        $$__referenceNumber: 'foobar',
        yesNoField: false
      }

      const request = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          ...requestPage,
          server: {
            plugins: {
              'forms-engine-plugin': { cacheService }
            }
          }
        })
      )

      const context = model.getFormContext(request, state)

      jest
        .spyOn(
          /** @type {{ hasMissingNotificationEmail: () => Promise<boolean> }} */ (
            /** @type {unknown} */ (controller)
          ),
          'hasMissingNotificationEmail'
        )
        .mockResolvedValue(false)

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(request, context, h)

      expect(cacheService.resetComponentStates).not.toHaveBeenCalled()
    })
  })

  describe('submitForm - hasPaymentBeenCaptured', () => {
    /**
     * Builds the set of stubs submitForm needs. For `captured: true`, we
     * set paymentState.capture.status=success so PaymentField.onSubmit
     * short-circuits and finaliseComponents passes. For `captured: false`,
     * we pick the zero-amount branch (yesNoField=true) so onSubmit
     * bypasses payment capture entirely — that way finaliseComponents
     * still succeeds but no captured payment exists when submitForm
     * evaluates hasPaymentBeenCaptured.
     * @param {{ captured: boolean }} param0
     */
    function buildSubmitHarness({ captured }) {
      /** @type {FormSubmissionState} */
      const state = captured
        ? /** @type {FormSubmissionState} */ (
            /** @type {unknown} */ ({
              $$__referenceNumber: 'foobar',
              yesNoField: false,
              paymentField: {
                paymentId: 'p-1',
                amount: 99,
                description: 'Test payment',
                reference: 'ref-1',
                preAuth: { status: 'success' },
                capture: { status: 'success' }
              }
            })
          )
        : /** @type {FormSubmissionState} */ ({
            $$__referenceNumber: 'foobar',
            yesNoField: true
          })

      const outputSubmit = jest.fn()
      const formSubmissionSubmit = jest.fn()

      model.services = /** @type {typeof model.services} */ ({
        ...model.services,
        formSubmissionService: {
          ...model.services.formSubmissionService,
          submit: formSubmissionSubmit.mockResolvedValue({
            data: { reference: 'r' }
          })
        },
        outputService: {
          ...model.services.outputService,
          submit: outputSubmit
        }
      })

      const request = /** @type {FormRequestPayload} */ (
        /** @type {unknown} */ ({
          ...requestPage,
          params: { ...requestPage.params, path: 'summary' },
          yar: { id: 'session-id', set: jest.fn(), get: jest.fn() },
          logger: { info: jest.fn(), error: jest.fn() }
        })
      )

      const context = model.getFormContext(request, state)

      const viewModel = /** @type {Parameters<typeof submitForm>[3]} */ (
        /** @type {unknown} */ ({
          context,
          details: []
        })
      )

      const formMetadata = /** @type {Parameters<typeof submitForm>[1]} */ (
        /** @type {unknown} */ ({
          contact: { online: { url: '/help' } }
        })
      )

      return {
        request,
        context,
        viewModel,
        formMetadata,
        outputSubmit,
        formSubmissionSubmit
      }
    }

    it('re-throws as PaymentSubmissionError when outputService fails and a payment has been captured', async () => {
      const { request, context, viewModel, formMetadata, outputSubmit } =
        buildSubmitHarness({ captured: true })

      outputSubmit.mockRejectedValue(new Error('downstream boom'))

      await expect(
        submitForm(
          context,
          formMetadata,
          request,
          viewModel,
          model,
          'notify@example.com',
          translator
        )
      ).rejects.toMatchObject({
        name: 'PaymentSubmissionError'
      })
    })

    it('re-throws the original error when no payment has been captured', async () => {
      const { request, context, viewModel, formMetadata, outputSubmit } =
        buildSubmitHarness({ captured: false })

      const err = new Error('downstream boom')
      outputSubmit.mockRejectedValue(err)

      await expect(
        submitForm(
          context,
          formMetadata,
          request,
          viewModel,
          model,
          'notify@example.com',
          translator
        )
      ).rejects.toBe(err)
    })

    it('submits with correct payload - non-Welsh enabled', async () => {
      const {
        request,
        context,
        viewModel,
        formMetadata,
        formSubmissionSubmit
      } = buildSubmitHarness({ captured: true })

      await submitForm(
        context,
        formMetadata,
        request,
        viewModel,
        model,
        'notify@example.com',
        translator
      )
      const paymentCall = formSubmissionSubmit.mock.calls[0][0]
      const paymentItems =
        /** @type {{ name: string, title: string, value: string }[]} */ (
          /** @type {unknown} */ (paymentCall.main)
        )
      expect(paymentItems).toHaveLength(4)
      expect(paymentItems[0]).toEqual({
        name: 'paymentField_paymentDescription',
        title: 'Payment description',
        value: 'Test payment'
      })
      expect(paymentItems[1]).toEqual({
        name: 'paymentField_paymentAmount',
        title: 'Payment amount',
        value: '£99.00'
      })
      expect(paymentItems[2]).toEqual({
        name: 'paymentField_paymentReference',
        title: 'Payment reference',
        value: 'ref-1'
      })
      expect(paymentItems[3]).toEqual({
        name: 'paymentField_paymentDate',
        title: 'Payment date',
        value: ''
      })
      expect(paymentCall.language).toBeUndefined()
    })

    it('submits with correct payload - Welsh selected', async () => {
      model.def.metadata = {
        translations: {
          cy: {
            'form.name': 'Some welsh'
          }
        }
      }
      const {
        request,
        context,
        viewModel,
        formMetadata,
        formSubmissionSubmit
      } = buildSubmitHarness({ captured: true })

      await submitForm(
        context,
        formMetadata,
        request,
        viewModel,
        model,
        'notify@example.com',
        welshTranslator
      )
      const paymentCall = formSubmissionSubmit.mock.calls[0][0]
      expect(paymentCall.language).toBe('cy')
    })
  })
})

/**
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 * @import { CacheService } from '~/src/server/services/cacheService.js'
 */
