import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'
// eslint-disable-next-line n/no-unpublished-import
import nock from 'nock'

import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import { makeGetHandler } from '~/src/server/plugins/engine/routes/questions.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'
jest.mock('~/src/server/plugins/engine/models/SummaryViewModel', () => ({
  SummaryViewModel: class {
    summary = 'mocked summary'
  }
}))

jest.mock(
  '~/src/server/plugins/engine/pageControllers/SummaryPageController',
  () => ({
    getFormSubmissionData: jest.fn().mockReturnValue([])
  })
)

jest.mock('~/src/server/plugins/engine/outputFormatters/machine/v1', () => ({
  format: jest.fn().mockReturnValue('mocked format')
}))

jest.mock('~/src/server/plugins/engine/routes/index')

describe('makeGetHandler', () => {
  let pageMock: PageControllerClass
  let contextMock: FormContext
  let modelMock: FormModel
  let requestMock: FormRequest
  let hMock: Pick<ResponseToolkit, 'redirect' | 'view'>

  beforeEach(() => {
    nock('http://test')
      .persist()
      .post('/load')
      .reply(200, {
        wasGetCalled: true
      })
      .post('/save')
      .reply(200, {
        wasPostCalled: true
      })

    modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    pageMock = createMockPageController(modelMock, (_request, _context, _h) =>
      Promise.resolve({ statusCode: 200 } as unknown as ResponseObject)
    )

    contextMock = { data: {}, model: {} } as unknown as FormContext

    requestMock = {
      params: { path: 'some-path' },
      app: { model: modelMock }
    } as FormRequest
    hMock = { redirect: jest.fn(), view: jest.fn() }
    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          _req: FormRequest | FormRequestPayload,
          _h: Pick<ResponseToolkit, 'redirect' | 'view'>,
          fn
        ) => Promise.resolve(fn(pageMock, contextMock))
      )
  })

  afterEach(() => {
    jest.mocked(redirectOrMakeHandler).mockRestore()
  })

  it('calls the callback when events.onLoad.type is http', async () => {
    let data = {}

    pageMock.makeGetRouteHandler =
      () =>
      (
        _request: FormRequest,
        context: FormContext,
        _h: Pick<ResponseToolkit, 'redirect' | 'view'>
      ) => {
        data = context.data
        return Promise.resolve({} as unknown as ResponseObject)
      }

    await makeGetHandler()(requestMock, hMock)

    expect(data).toMatchObject({
      wasGetCalled: true
    })
  })
})

function createMockPageController(
  model: FormModel,
  routeHandler: (
    request: FormRequest,
    context: FormContext,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) => ResponseObject | Promise<ResponseObject>
): PageControllerClass {
  return {
    model,
    events: {
      onLoad: {
        type: 'http',
        options: { method: 'POST', url: 'http://test/load' }
      },
      onSave: {
        type: 'http',
        options: { method: 'POST', url: 'http://test/save' }
      }
    },
    makeGetRouteHandler: routeHandler,
    makePostRouteHandler: routeHandler
  } as unknown as PageControllerClass
}
