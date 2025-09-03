import Boom from '@hapi/boom'
import { type ResponseObject } from '@hapi/hapi'
// eslint-disable-next-line n/no-unpublished-import
import nock from 'nock'

import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import {
  makeGetHandler,
  makePostHandler
} from '~/src/server/plugins/engine/routes/questions.js'
import {
  type AnyFormRequest,
  type FormContext
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormResponseToolkit
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
  const hMock: FormResponseToolkit = {
    redirect: jest.fn(),
    view: jest.fn()
  }

  beforeEach(() => {
    nock('http://test').persist().post('/load').reply(200, {
      wasGetCalled: true
    })
  })

  afterEach(() => {
    jest.mocked(redirectOrMakeHandler).mockRestore()
    nock.cleanAll()
  })

  it('calls the callback when events.onLoad.type is http', async () => {
    let data = {}

    const modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    const pageMock = createMockPageController(
      modelMock,
      (
        _request: FormRequest,
        context: FormContext,
        _h: FormResponseToolkit
      ) => {
        data = context.data
        return Promise.resolve({} as unknown as ResponseObject)
      }
    )

    const contextMock = { data: {}, model: {} } as unknown as FormContext

    const requestMock = {
      params: { path: 'some-path' },
      app: { model: modelMock }
    } as FormRequest

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation((_req: AnyFormRequest, _h: FormResponseToolkit, fn) =>
        Promise.resolve(fn(pageMock, contextMock))
      )

    await makeGetHandler()(requestMock, hMock)

    expect(data).toMatchObject({
      wasGetCalled: true
    })
  })

  it('does not call the callback when the events.onLoad.type is not http', async () => {
    let data = {}

    const modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    const pageMock = createMockPageController(
      modelMock,
      (
        _request: FormRequest,
        context: FormContext,
        _h: FormResponseToolkit
      ) => {
        data = context.data
        return Promise.resolve({} as unknown as ResponseObject)
      }
    )

    pageMock.events = {}

    const contextMock = { data: {}, model: {} } as unknown as FormContext

    const requestMock = {
      params: { path: 'some-path' },
      app: { model: modelMock }
    } as FormRequest

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation((_req: AnyFormRequest, _h: FormResponseToolkit, fn) =>
        Promise.resolve(fn(pageMock, contextMock))
      )

    await makeGetHandler()(requestMock, hMock)

    expect(data).toMatchObject({})
  })

  it('throws when model is missing', async () => {
    let error

    const modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    const pageMock = createMockPageController(
      modelMock,
      (
        _request: FormRequest,
        _context: FormContext,
        _h: FormResponseToolkit
      ) => {
        return Promise.resolve({} as unknown as ResponseObject)
      }
    )

    const contextMock = { data: {}, model: {} } as unknown as FormContext

    const requestMock = {
      params: { path: 'some-path' },
      app: {}
    } as FormRequest

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        async (_req: AnyFormRequest, _h: FormResponseToolkit, fn) => {
          try {
            await fn(pageMock, contextMock)
          } catch (err) {
            error = err
          }

          return Promise.resolve({} as unknown as ResponseObject)
        }
      )

    await makeGetHandler()(requestMock, hMock)

    expect(error).toEqual(Boom.notFound('No model found for /some-path'))
  })
})

describe('makePostHandler', () => {
  const hMock: FormResponseToolkit = {
    redirect: jest.fn(),
    view: jest.fn()
  }

  beforeEach(() => {
    nock('http://test').post('/save').reply(200, {
      wasPostCalled: true
    })
  })

  afterEach(() => {
    jest.mocked(redirectOrMakeHandler).mockRestore()
    nock.cleanAll()
  })

  it('calls the callback when events.onSave.type is http and the page controller was successful', async () => {
    const mockPostResponse: ResponseObject = {
      statusCode: 200
    } as ResponseObject

    const modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    const pageMock = createMockPageController(
      modelMock,
      (
        _request: FormRequest,
        _context: FormContext,
        _h: FormResponseToolkit
      ) => {
        // do return a valid ResponseObject wrapped in Promise.resolve
        return mockPostResponse
      }
    )

    const contextMock = { data: {}, model: {} } as unknown as FormContext

    const requestMock = {
      params: { path: 'some-path' },
      app: { model: modelMock },
      payload: { some: 'payload' }
    } as unknown as FormRequestPayload

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation((_req: AnyFormRequest, _h: FormResponseToolkit, fn) =>
        Promise.resolve(fn(pageMock, contextMock))
      )

    const response = await makePostHandler()(requestMock, hMock)

    expect(nock.pendingMocks()).toBeEmpty()
    expect(response).toBe(mockPostResponse)
  })

  it('does not call the callback when the events.onSave.type is not http', async () => {
    const modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    const pageMock = createMockPageController(
      modelMock,
      (
        _request: FormRequest,
        _context: FormContext,
        _h: FormResponseToolkit
      ) => {
        return Promise.resolve({} as unknown as ResponseObject)
      }
    )

    pageMock.events = {}

    const contextMock = { data: {}, model: {} } as unknown as FormContext

    const requestMock = {
      params: { path: 'some-path' },
      app: { model: modelMock },
      payload: { some: 'payload' }
    } as unknown as FormRequestPayload

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation((_req: AnyFormRequest, _h: FormResponseToolkit, fn) =>
        Promise.resolve(fn(pageMock, contextMock))
      )

    await makePostHandler()(requestMock, hMock)

    expect(nock.pendingMocks()).not.toBeEmpty()
  })

  it('does not call the callback when events.onSave.type is http and the page controller was unsuccessful', async () => {
    const mockPostResponse: ResponseObject = {
      statusCode: 500
    } as ResponseObject

    const modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    const pageMock = createMockPageController(
      modelMock,
      (
        _request: FormRequest,
        _context: FormContext,
        _h: FormResponseToolkit
      ) => {
        // do return a valid ResponseObject wrapped in Promise.resolve
        return mockPostResponse
      }
    )

    const contextMock = { data: {}, model: {} } as unknown as FormContext

    const requestMock = {
      params: { path: 'some-path' },
      app: { model: modelMock },
      payload: { some: 'payload' }
    } as unknown as FormRequestPayload

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation((_req: AnyFormRequest, _h: FormResponseToolkit, fn) =>
        Promise.resolve(fn(pageMock, contextMock))
      )

    await makePostHandler()(requestMock, hMock)

    expect(nock.pendingMocks()).not.toBeEmpty()
  })

  it('throws when model is missing', async () => {
    let error

    const modelMock = {
      basePath: 'some-base-path',
      def: { name: 'Hello world' }
    } as FormModel

    const pageMock = createMockPageController(
      modelMock,
      (
        _request: FormRequest,
        _context: FormContext,
        _h: FormResponseToolkit
      ) => {
        return Promise.resolve({} as unknown as ResponseObject)
      }
    )

    const contextMock = { data: {}, model: {} } as unknown as FormContext

    const requestMock = {
      params: { path: 'some-path' },
      app: {},
      payload: { some: 'payload' }
    } as unknown as FormRequestPayload

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        async (_req: AnyFormRequest, _h: FormResponseToolkit, fn) => {
          try {
            await fn(pageMock, contextMock)
          } catch (err) {
            error = err
          }

          return Promise.resolve({} as unknown as ResponseObject)
        }
      )

    await makePostHandler()(requestMock, hMock)

    expect(error).toEqual(Boom.notFound('No model found for /some-path'))
  })
})

function createMockPageController(
  model: FormModel,
  routeHandler: (
    request: FormRequest,
    context: FormContext,
    h: FormResponseToolkit
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
    makeGetRouteHandler: () => routeHandler,
    makePostRouteHandler: () => routeHandler
  } as unknown as PageControllerClass
}
