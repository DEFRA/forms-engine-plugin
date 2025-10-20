import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { SummaryPageController } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/cacheService.js'
import definition from '~/test/form/definitions/basic.js'

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
})
