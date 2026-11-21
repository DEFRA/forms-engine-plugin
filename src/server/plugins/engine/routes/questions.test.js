import Boom from '@hapi/boom'
import nock from 'nock'

import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import {
  makeGetHandler,
  makePostHandler
} from '~/src/server/plugins/engine/routes/questions.js'
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
  /** @type {FormResponseToolkit} */
  const hMock = {
    redirect: jest.fn().mockReturnValue({
      takeover: jest.fn().mockReturnValue({
        statusCode: 302,
        headers: { location: '/redirect-url' }
      })
    }),
    view: jest.fn(),
    continue: Symbol('continue')
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

    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        data = context.data
        return Promise.resolve(
          /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
        )
      }
    )

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequest} */ ({
      server: { plugins: { 'forms-engine-plugin': {} } },
      params: { path: 'some-path' },
      app: { model: modelMock }
    })

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          _onRequest,
          fn
        ) => Promise.resolve(fn(pageMock, contextMock))
      )

    await makeGetHandler()(requestMock, hMock)

    expect(data).toMatchObject({
      wasGetCalled: true
    })
  })

  it('does not call the callback when the events.onLoad.type is not http', async () => {
    let data = {}

    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        data = context.data
        return Promise.resolve(
          /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
        )
      }
    )

    pageMock.events = {}

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequest} */ ({
      server: { plugins: { 'forms-engine-plugin': {} } },
      params: { path: 'some-path' },
      app: { model: modelMock }
    })

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          _onRequest,
          fn
        ) => Promise.resolve(fn(pageMock, contextMock))
      )

    await makeGetHandler()(requestMock, hMock)

    expect(data).toMatchObject({})
  })

  it('throws when model is missing', async () => {
    let error

    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ _context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        return Promise.resolve(
          /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
        )
      }
    )

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequest} */ ({
      server: { plugins: { 'forms-engine-plugin': {} } },
      params: { path: 'some-path' },
      app: {}
    })

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        async (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          _onRequest,
          fn
        ) => {
          try {
            await fn(pageMock, contextMock)
          } catch (err) {
            error = err
          }

          return Promise.resolve(
            /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
          )
        }
      )

    await makeGetHandler()(requestMock, hMock)

    expect(error).toEqual(Boom.notFound('No model found for /some-path'))
  })

  it('should pass onRequest callback to redirectOrMakeHandler', async () => {
    const onRequestCallback = jest.fn().mockResolvedValue(undefined)
    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ _context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        return Promise.resolve(
          /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
        )
      }
    )

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequest} */ ({
      server: { plugins: { 'forms-engine-plugin': {} } },
      params: { path: 'some-path' },
      app: { model: modelMock }
    })

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          onRequest,
          fn
        ) => {
          expect(onRequest).toBe(onRequestCallback)
          return Promise.resolve(fn(pageMock, contextMock))
        }
      )

    await makeGetHandler(undefined, onRequestCallback)(requestMock, hMock)

    expect(redirectOrMakeHandler).toHaveBeenCalledWith(
      requestMock,
      hMock,
      onRequestCallback,
      expect.any(Function)
    )
  })
})

describe('makePostHandler', () => {
  /** @type {FormResponseToolkit} */
  const hMock = {
    redirect: jest.fn(),
    view: jest.fn(),
    continue: Symbol('continue')
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
    /** @type {ResponseObject} */
    const mockPostResponse = /** @type {ResponseObject} */ ({
      statusCode: 200
    })

    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ _context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        // do return a valid ResponseObject wrapped in Promise.resolve
        return mockPostResponse
      }
    )

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequestPayload} */ (
      /** @type {unknown} */ ({
        server: { plugins: { 'forms-engine-plugin': {} } },
        params: { path: 'some-path' },
        app: { model: modelMock },
        payload: { some: 'payload' }
      })
    )

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          _onRequest,
          fn
        ) => Promise.resolve(fn(pageMock, contextMock))
      )

    const response = await makePostHandler()(requestMock, hMock)

    expect(nock.pendingMocks()).toBeEmpty()
    expect(response).toBe(mockPostResponse)
  })

  it('does not call the callback when the events.onSave.type is not http', async () => {
    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ _context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        return Promise.resolve(
          /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
        )
      }
    )

    pageMock.events = {}

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequestPayload} */ (
      /** @type {unknown} */ ({
        server: { plugins: { 'forms-engine-plugin': {} } },
        params: { path: 'some-path' },
        app: { model: modelMock },
        payload: { some: 'payload' }
      })
    )

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          _onRequest,
          fn
        ) => Promise.resolve(fn(pageMock, contextMock))
      )

    await makePostHandler()(requestMock, hMock)

    expect(nock.pendingMocks()).not.toBeEmpty()
  })

  it('does not call the callback when events.onSave.type is http and the page controller was unsuccessful', async () => {
    /** @type {ResponseObject} */
    const mockPostResponse = /** @type {ResponseObject} */ ({
      statusCode: 500
    })

    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ _context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        // do return a valid ResponseObject wrapped in Promise.resolve
        return mockPostResponse
      }
    )

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequestPayload} */ (
      /** @type {unknown} */ ({
        server: { plugins: { 'forms-engine-plugin': {} } },
        params: { path: 'some-path' },
        app: { model: modelMock },
        payload: { some: 'payload' }
      })
    )

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          _onRequest,
          fn
        ) => Promise.resolve(fn(pageMock, contextMock))
      )

    await makePostHandler()(requestMock, hMock)

    expect(nock.pendingMocks()).not.toBeEmpty()
  })

  it('throws when model is missing', async () => {
    let error

    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ _context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        return Promise.resolve(
          /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
        )
      }
    )

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequestPayload} */ (
      /** @type {unknown} */ ({
        server: { plugins: { 'forms-engine-plugin': {} } },
        params: { path: 'some-path' },
        app: {},
        payload: { some: 'payload' }
      })
    )

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        async (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          _onRequest,
          fn
        ) => {
          try {
            await fn(pageMock, contextMock)
          } catch (err) {
            error = err
          }

          return Promise.resolve(
            /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
          )
        }
      )

    await makePostHandler()(requestMock, hMock)

    expect(error).toEqual(Boom.notFound('No model found for /some-path'))
  })

  it('should pass onRequest callback to redirectOrMakeHandler', async () => {
    const onRequestCallback = jest.fn().mockResolvedValue(undefined)
    const modelMock = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        basePath: 'some-base-path',
        def: { name: 'Hello world' },
        createTranslator: jest.fn().mockReturnValue({
          t: jest.fn(),
          tPage: jest.fn(),
          tComponent: jest.fn(),
          tSection: jest.fn(),
          tListItem: jest.fn(),
          tForm: jest.fn(),
          language: 'en-GB'
        })
      })
    )

    const pageMock = createMockPageController(
      modelMock,
      (
        /** @type {FormRequest} */ _request,
        /** @type {FormContext} */ _context,
        /** @type {FormResponseToolkit} */ _h
      ) => {
        return Promise.resolve(
          /** @type {ResponseObject} */ (/** @type {unknown} */ ({}))
        )
      }
    )

    const contextMock = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ data: {}, model: {} })
    )

    const requestMock = /** @type {FormRequestPayload} */ (
      /** @type {unknown} */ ({
        server: { plugins: { 'forms-engine-plugin': {} } },
        params: { path: 'some-path' },
        app: { model: modelMock },
        payload: { some: 'payload' }
      })
    )

    jest
      .mocked(redirectOrMakeHandler)
      .mockImplementation(
        (
          /** @type {AnyFormRequest} */ _req,
          /** @type {FormResponseToolkit} */ _h,
          onRequest,
          fn
        ) => {
          expect(onRequest).toBe(onRequestCallback)
          return Promise.resolve(fn(pageMock, contextMock))
        }
      )

    await makePostHandler(undefined, onRequestCallback)(requestMock, hMock)

    expect(redirectOrMakeHandler).toHaveBeenCalledWith(
      requestMock,
      hMock,
      onRequestCallback,
      expect.any(Function)
    )
  })
})

/**
 * @param {FormModel} model
 * @param {(
 *   request: FormRequest,
 *   context: FormContext,
 *   h: FormResponseToolkit
 * ) => ResponseObject | Promise<ResponseObject>} routeHandler
 * @returns {PageControllerClass}
 */
function createMockPageController(model, routeHandler) {
  return /** @type {PageControllerClass} */ (
    /** @type {unknown} */ ({
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
    })
  )
}

/**
 * @import { ResponseObject } from '@hapi/hapi'
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { AnyFormRequest, FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
