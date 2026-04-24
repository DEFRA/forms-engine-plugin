import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  SummaryPageController,
  submitForm
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/cacheService.js'
import definition from '~/test/form/definitions/basic.js'
import definitionPaymentV2Conditional from '~/test/form/definitions/payment-v2-conditional.js'

describe('SummaryPageController', () => {
  let model: FormModel
  let controller: SummaryPageController
  let requestPage: FormRequest

  const response = {
    code: jest.fn().mockImplementation(() => response)
  }
  const h: FormResponseToolkit = {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    controller = new SummaryPageController(model, mockPage as any)

    requestPage = buildFormRequest({
      method: 'get',
      url: new URL('http://example.com/test/summary'),
      path: '/test/summary',
      params: {
        path: 'summary',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest)
  })

  describe('handleSaveAndExit', () => {
    it('should invoke saveAndExit plugin option', async () => {
      const saveAndExitMock = jest.fn(() => ({}))
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        licenceLength: 365,
        fullName: 'John Smith'
      }
      const request = {
        ...requestPage,
        server: {
          plugins: {
            'forms-engine-plugin': {
              saveAndExit: saveAndExitMock,
              cacheService: {
                clearState: jest.fn()
              } as unknown as CacheService
            }
          }
        },
        method: 'post',
        payload: { fullName: 'John Smith', action: 'save-and-exit' }
      } as unknown as FormRequestPayload

      const context = model.getFormContext(request, state)

      const postHandler = controller.makePostRouteHandler()
      await postHandler(request, context, h)

      expect(saveAndExitMock).toHaveBeenCalledWith(request, h, context)
    })
  })

  // Note: InvalidComponentStateError handling is comprehensively tested
  // in the integration test: test/form/component-state-errors.test.js
})

describe('SummaryPageController - Payment (DF-832)', () => {
  let model: FormModel
  let controller: SummaryPageController
  let requestPage: FormRequest

  const response = {
    code: jest.fn().mockImplementation(() => response)
  }
  const h: FormResponseToolkit = {
    redirect: jest.fn().mockReturnValue(response),
    view: jest.fn(),
    continue: Symbol('continue')
  }

  beforeEach(() => {
    model = new FormModel(definitionPaymentV2Conditional, {
      basePath: 'test'
    })

    controller = model.pages.find(
      (p) => p.path === '/summary'
    ) as SummaryPageController

    requestPage = buildFormRequest({
      method: 'get',
      url: new URL('http://example.com/test/summary'),
      path: '/test/summary',
      params: {
        path: 'summary',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest)
  })

  describe('GET handler: paymentComplete=true', () => {
    it('auto-submits without going through reconcile/view when paymentComplete=true', async () => {
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        yesNoField: false
      }
      const request = {
        ...requestPage,
        query: { paymentComplete: 'true' }
      } as unknown as FormRequest

      const context = model.getFormContext(request, state)

      const handleFormSubmitSpy = jest
        .spyOn(controller, 'handleFormSubmit')
        .mockResolvedValue(
          undefined as unknown as ReturnType<typeof controller.handleFormSubmit>
        )

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(request, context, h)

      expect(handleFormSubmitSpy).toHaveBeenCalledTimes(1)
      // The GET handler should short-circuit before rendering the view
      expect(h.view).not.toHaveBeenCalled()
    })

    it('follows the normal CYA render path when paymentComplete is absent', async () => {
      const cacheService = {
        resetComponentStates: jest.fn()
      } as unknown as CacheService

      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        yesNoField: false
      }
      const request = {
        ...requestPage,
        server: {
          plugins: {
            'forms-engine-plugin': { cacheService }
          }
        }
      } as unknown as FormRequest

      const context = model.getFormContext(request, state)

      jest
        .spyOn(controller, 'handleFormSubmit')
        .mockResolvedValue(
          undefined as unknown as ReturnType<typeof controller.handleFormSubmit>
        )
      // Avoid hitting hasMissingNotificationEmail's real implementation
      jest
        .spyOn(
          controller as unknown as {
            hasMissingNotificationEmail: () => Promise<boolean>
          },
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
      const cacheService = {
        resetComponentStates: jest.fn().mockResolvedValue(undefined)
      } as unknown as CacheService

      // yesNoField=false resolves to £99 (see fixture), but the stored
      // pre-auth is at £50 (the base amount). This mismatch should
      // trigger a reset of paymentField's stored state.
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        yesNoField: false,
        paymentField: {
          paymentId: 'stale-id',
          amount: 50,
          description: 'Test payment',
          preAuth: { status: 'success' }
        }
      } as unknown as FormSubmissionState

      const request = {
        ...requestPage,
        server: {
          plugins: {
            'forms-engine-plugin': { cacheService }
          }
        }
      } as unknown as FormRequest

      const context = model.getFormContext(request, state)

      jest
        .spyOn(
          controller as unknown as {
            hasMissingNotificationEmail: () => Promise<boolean>
          },
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
      const cacheService = {
        resetComponentStates: jest.fn()
      } as unknown as CacheService

      // yesNoField=false resolves to £99; stored pre-auth also at £99.
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        yesNoField: false,
        paymentField: {
          paymentId: 'fresh-id',
          amount: 99,
          description: 'Test payment',
          preAuth: { status: 'success' }
        }
      } as unknown as FormSubmissionState

      const request = {
        ...requestPage,
        server: {
          plugins: {
            'forms-engine-plugin': { cacheService }
          }
        }
      } as unknown as FormRequest

      const context = model.getFormContext(request, state)

      jest
        .spyOn(
          controller as unknown as {
            hasMissingNotificationEmail: () => Promise<boolean>
          },
          'hasMissingNotificationEmail'
        )
        .mockResolvedValue(false)

      const getHandler = controller.makeGetRouteHandler()
      await getHandler(request, context, h)

      expect(cacheService.resetComponentStates).not.toHaveBeenCalled()
    })

    it('does nothing when no paymentState is stored yet', async () => {
      const cacheService = {
        resetComponentStates: jest.fn()
      } as unknown as CacheService

      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        yesNoField: false
      }

      const request = {
        ...requestPage,
        server: {
          plugins: {
            'forms-engine-plugin': { cacheService }
          }
        }
      } as unknown as FormRequest

      const context = model.getFormContext(request, state)

      jest
        .spyOn(
          controller as unknown as {
            hasMissingNotificationEmail: () => Promise<boolean>
          },
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
     */
    function buildSubmitHarness({ captured }: { captured: boolean }) {
      const state: FormSubmissionState = captured
        ? ({
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
          } as unknown as FormSubmissionState)
        : ({
            $$__referenceNumber: 'foobar',
            yesNoField: true
          } as FormSubmissionState)

      const outputSubmit = jest.fn()

      model.services = {
        ...model.services,
        formSubmissionService: {
          ...model.services.formSubmissionService,
          submit: jest.fn().mockResolvedValue({ data: { reference: 'r' } })
        },
        outputService: {
          ...model.services.outputService,
          submit: outputSubmit
        }
      } as typeof model.services

      const request = {
        ...requestPage,
        params: { ...requestPage.params, path: 'summary' },
        yar: { id: 'session-id' },
        logger: { info: jest.fn(), error: jest.fn() }
      } as unknown as FormRequestPayload

      const context = model.getFormContext(request, state)

      const viewModel = {
        context,
        details: []
      } as unknown as Parameters<typeof submitForm>[3]

      const formMetadata = {
        contact: { online: { url: '/help' } }
      } as unknown as Parameters<typeof submitForm>[1]

      return { request, context, viewModel, formMetadata, outputSubmit }
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
          'notify@example.com'
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
          'notify@example.com'
        )
      ).rejects.toBe(err)
    })
  })
})
