import Boom from '@hapi/boom'
import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'

import {
  findPage,
  getCacheService,
  getPage,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import {
  type AnyFormRequest,
  type OnRequestCallback
} from '~/src/server/plugins/engine/types.js'
import { type FormResponseToolkit } from '~/src/server/routes/types.js'

jest.mock('~/src/server/plugins/engine/helpers')

describe('redirectOrMakeHandler', () => {
  const mockServer = {} as unknown as Parameters<
    typeof redirectOrMakeHandler
  >[0]['server']
  const mockRequest: AnyFormRequest = {
    server: mockServer,
    app: {},
    params: { path: 'test-path' },
    query: {}
  } as unknown as AnyFormRequest

  const mockH: FormResponseToolkit = {
    redirect: jest.fn(),
    view: jest.fn(),
    continue: Symbol('continue')
  } as unknown as FormResponseToolkit

  let mockPage: PageControllerClass

  const mockModel: FormModel = {
    def: {
      metadata: {
        submission: { code: 'TEST-CODE' }
      } as { submission: { code: string } }
    },
    getFormContext: jest.fn().mockReturnValue({
      isForceAccess: false,
      data: {}
    })
  } as unknown as FormModel

  const mockMakeHandler = jest
    .fn()
    .mockResolvedValue({ statusCode: 200 } as ResponseObject)

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest.app = { model: mockModel }

    // Reset mock page
    mockPage = {
      getState: jest.fn().mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
      mergeState: jest
        .fn()
        .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
      getRelevantPath: jest.fn().mockReturnValue('/test-path'),
      getSummaryPath: jest.fn().mockReturnValue('/summary'),
      getHref: jest.fn().mockReturnValue('/test-href'),
      path: '/test-path'
    } as unknown as PageControllerClass

    // Reset mock model
    mockModel.getFormContext = jest.fn().mockReturnValue({
      isForceAccess: false,
      data: {}
    })

    // Setup mocks
    ;(getCacheService as jest.Mock).mockReturnValue({
      getFlash: jest.fn().mockReturnValue({ errors: [] })
    })
    ;(getPage as jest.Mock).mockReturnValue(mockPage)
    ;(findPage as jest.Mock).mockReturnValue({ next: [] })
    ;(proceed as jest.Mock).mockReturnValue({ statusCode: 302 })
  })

  describe('onRequest callback functionality', () => {
    it('should call onRequest callback when provided', async () => {
      const onRequestCallback: OnRequestCallback = jest
        .fn()
        .mockResolvedValue(undefined)

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        onRequestCallback,
        mockMakeHandler
      )

      expect(onRequestCallback).toHaveBeenCalledWith(
        mockRequest,
        mockH as ResponseToolkit,
        expect.objectContaining({
          isForceAccess: false,
          data: {}
        })
      )
    })

    it('should not call onRequest callback when not provided', async () => {
      const onRequestCallback = jest.fn()

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        undefined,
        mockMakeHandler
      )

      expect(onRequestCallback).not.toHaveBeenCalled()
    })

    it('should return takeover response when onRequest returns takeover response', async () => {
      const takeoverResponse = {
        statusCode: 302,
        headers: { location: '/redirect-url' },
        _takeover: true
      } as unknown as ResponseObject

      const onRequestCallback: OnRequestCallback = jest
        .fn()
        .mockResolvedValue(takeoverResponse)

      const result = await redirectOrMakeHandler(
        mockRequest,
        mockH,
        onRequestCallback,
        mockMakeHandler
      )

      expect(result).toBe(takeoverResponse)
      expect(mockMakeHandler).not.toHaveBeenCalled()
    })

    it('should continue processing when onRequest returns h.continue', async () => {
      const onRequestCallback: OnRequestCallback = jest
        .fn()
        .mockResolvedValue(mockH.continue)

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        onRequestCallback,
        mockMakeHandler
      )

      expect(mockMakeHandler).toHaveBeenCalledWith(mockPage, expect.any(Object))
    })

    it('should handle onRequest callback errors', async () => {
      const error = new Error('onRequest callback error')
      const onRequestCallback: OnRequestCallback = jest
        .fn()
        .mockRejectedValue(error)

      await expect(
        redirectOrMakeHandler(
          mockRequest,
          mockH,
          onRequestCallback,
          mockMakeHandler
        )
      ).rejects.toThrow('onRequest callback error')
    })
  })

  describe('existing functionality', () => {
    it('should throw error when model is missing', async () => {
      mockRequest.app = {}

      await expect(
        redirectOrMakeHandler(mockRequest, mockH, undefined, mockMakeHandler)
      ).rejects.toThrow(Boom.notFound('No model found for /test-path'))
    })

    it('should call makeHandler when page is relevant', async () => {
      const testPage = {
        getState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        mergeState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        getSummaryPath: jest.fn().mockReturnValue('/summary'),
        getHref: jest.fn().mockReturnValue('/test-href'),
        getRelevantPath: jest.fn().mockReturnValue('/test-path'),
        path: '/test-path'
      } as unknown as PageControllerClass
      ;(getPage as jest.Mock).mockReturnValue(testPage)

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        undefined,
        mockMakeHandler
      )

      expect(mockMakeHandler).toHaveBeenCalledWith(testPage, expect.any(Object))
    })

    it('should call makeHandler when context has force access', async () => {
      mockModel.getFormContext = jest.fn().mockReturnValue({
        isForceAccess: true,
        data: {}
      })

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        undefined,
        mockMakeHandler
      )

      expect(mockMakeHandler).toHaveBeenCalledWith(mockPage, expect.any(Object))
    })

    it('should redirect when page is not relevant', async () => {
      const testPage = {
        getState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        mergeState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        getSummaryPath: jest.fn().mockReturnValue('/summary'),
        getHref: jest.fn().mockReturnValue('/test-href'),
        getRelevantPath: jest.fn().mockReturnValue('/other-path'),
        path: '/test-path'
      } as unknown as PageControllerClass
      ;(getPage as jest.Mock).mockReturnValue(testPage)

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        undefined,
        mockMakeHandler
      )

      expect(proceed).toHaveBeenCalledWith(mockRequest, mockH, '/test-href')
      expect(mockMakeHandler).not.toHaveBeenCalled()
    })

    it('should set returnUrl when redirecting and next pages exist', async () => {
      const testPage = {
        getState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        mergeState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        getSummaryPath: jest.fn().mockReturnValue('/summary'),
        getRelevantPath: jest.fn().mockReturnValue('/other-path'),
        path: '/test-path',
        getHref: jest
          .fn()
          .mockReturnValueOnce('/summary-href') // First call: for summaryPath (returnUrl)
          .mockReturnValueOnce('/relevant-path-href') // Second call: for relevantPath (redirect)
      } as unknown as PageControllerClass
      ;(getPage as jest.Mock).mockReturnValue(testPage)
      ;(findPage as jest.Mock).mockReturnValue({ next: ['next-page'] })

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        undefined,
        mockMakeHandler
      )

      expect(mockRequest.query.returnUrl).toBe('/summary-href')
      expect(proceed).toHaveBeenCalledWith(
        mockRequest,
        mockH,
        '/relevant-path-href'
      )
    })

    it('should not set returnUrl when redirecting and no next pages exist', async () => {
      const testPage = {
        getState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        mergeState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        getSummaryPath: jest.fn().mockReturnValue('/summary'),
        getHref: jest.fn().mockReturnValue('/test-href'),
        getRelevantPath: jest.fn().mockReturnValue('/other-path'),
        path: '/test-path'
      } as unknown as PageControllerClass
      ;(getPage as jest.Mock).mockReturnValue(testPage)
      const returnUrlBefore = mockRequest.query.returnUrl
      ;(findPage as jest.Mock).mockReturnValue({ next: [] })

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        undefined,
        mockMakeHandler
      )

      // returnUrl should not be set if next pages don't exist
      expect(mockRequest.query.returnUrl).toBe(returnUrlBefore)
      expect(proceed).toHaveBeenCalledWith(mockRequest, mockH, '/test-href')
    })
  })
})
