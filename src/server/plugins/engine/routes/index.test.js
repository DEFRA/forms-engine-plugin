import Boom from '@hapi/boom'

import {
  findPage,
  getCacheService,
  getPage,
  getPluginOptions,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'

jest.mock('~/src/server/plugins/engine/helpers')

function buildMockModel(
  pagesOverride = /** @type {Page[]} */ ([]),
  pagesControllerOverride = /** @type {PageControllerClass[]} */ ([]),
  servicesOverride = /** @type {Services} */ ({})
) {
  return /** @type {FormModel} */ (
    /** @type {unknown} */ ({
      def: {
        metadata: /** @type {{ submission: { code: string } }} */ ({
          submission: { code: 'TEST-CODE' }
        }),
        pages: pagesOverride
      },
      getFormContext: jest.fn().mockReturnValue({
        isForceAccess: false,
        data: {}
      }),
      createTranslator: jest.fn().mockReturnValue({
        t: jest.fn(),
        tPage: jest.fn(),
        tComponent: jest.fn(),
        tSection: jest.fn(),
        tListItem: jest.fn(),
        tForm: jest.fn(),
        language: 'en-GB'
      }),
      pages: pagesControllerOverride,
      services: servicesOverride
    })
  )
}

describe('redirectOrMakeHandler', () => {
  const mockServer =
    /** @type {Parameters<typeof redirectOrMakeHandler>[0]['server']} */ (
      /** @type {unknown} */ ({
        plugins: { 'forms-engine-plugin': {} }
      })
    )
  /** @type {AnyFormRequest} */
  const mockRequest = /** @type {AnyFormRequest} */ (
    /** @type {unknown} */ ({
      server: mockServer,
      app: {},
      yar: { flash: () => [] },
      params: { path: 'test-path' },
      query: {}
    })
  )

  /** @type {FormResponseToolkit} */
  const mockH = /** @type {FormResponseToolkit} */ (
    /** @type {unknown} */ ({
      redirect: jest.fn(),
      view: jest.fn(),
      continue: Symbol('continue')
    })
  )

  /** @type {PageControllerClass} */
  let mockPage

  const mockModel = buildMockModel()

  const mockMakeHandler = jest
    .fn()
    .mockResolvedValue(/** @type {ResponseObject} */ ({ statusCode: 200 }))

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest.app = { model: mockModel }

    // Reset mock page
    mockPage = /** @type {PageControllerClass} */ (
      /** @type {unknown} */ ({
        getState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        mergeState: jest
          .fn()
          .mockResolvedValue({ $$__referenceNumber: 'REF-123' }),
        getRelevantPath: jest.fn().mockReturnValue('/test-path'),
        getSummaryPath: jest.fn().mockReturnValue('/summary'),
        getHref: jest.fn().mockReturnValue('/test-href'),
        path: '/test-path'
      })
    )

    // Reset mock model
    mockModel.getFormContext = jest.fn().mockReturnValue({
      isForceAccess: false,
      data: {},
      state: {}
    })

    // Setup mocks
    jest.mocked(/** @type {jest.Mock} */ (getCacheService)).mockReturnValue({
      getFlash: jest.fn().mockReturnValue({ errors: [] })
    })
    jest.mocked(/** @type {jest.Mock} */ (getPluginOptions)).mockReturnValue({})
    jest.mocked(getPage).mockReturnValue(mockPage)
    jest
      .mocked(/** @type {jest.Mock} */ (findPage))
      .mockReturnValue({ next: [] })
    jest
      .mocked(/** @type {jest.Mock} */ (proceed))
      .mockReturnValue({ statusCode: 302 })
  })

  describe('onRequest callback functionality', () => {
    it('should call onRequest callback when provided', async () => {
      /** @type {OnRequestCallback} */
      const onRequestCallback = jest.fn().mockResolvedValue(undefined)

      await redirectOrMakeHandler(
        mockRequest,
        mockH,
        onRequestCallback,
        mockMakeHandler
      )

      expect(onRequestCallback).toHaveBeenCalledWith(
        mockRequest,
        /** @type {ResponseToolkit} */ (mockH),
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
      const takeoverResponse = /** @type {ResponseObject} */ (
        /** @type {unknown} */ ({
          statusCode: 302,
          headers: { location: '/redirect-url' },
          _takeover: true
        })
      )

      /** @type {OnRequestCallback} */
      const onRequestCallback = jest.fn().mockResolvedValue(takeoverResponse)

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
      /** @type {OnRequestCallback} */
      const onRequestCallback = jest.fn().mockResolvedValue(mockH.continue)

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
      /** @type {OnRequestCallback} */
      const onRequestCallback = jest.fn().mockRejectedValue(error)

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
      const testPage = /** @type {PageControllerClass} */ (
        /** @type {unknown} */ ({
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
        })
      )
      jest.mocked(getPage).mockReturnValue(testPage)

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
        data: {},
        state: {}
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
      const testPage = /** @type {PageControllerClass} */ (
        /** @type {unknown} */ ({
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
        })
      )
      jest.mocked(getPage).mockReturnValue(testPage)

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
      const testPage = /** @type {PageControllerClass} */ (
        /** @type {unknown} */ ({
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
        })
      )
      jest.mocked(getPage).mockReturnValue(testPage)
      jest
        .mocked(/** @type {jest.Mock} */ (findPage))
        .mockReturnValue({ next: ['next-page'] })

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
      const testPage = /** @type {PageControllerClass} */ (
        /** @type {unknown} */ ({
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
        })
      )
      jest.mocked(getPage).mockReturnValue(testPage)
      const returnUrlBefore = mockRequest.query.returnUrl
      jest
        .mocked(/** @type {jest.Mock} */ (findPage))
        .mockReturnValue({ next: [] })

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

/**
 * @import { Page } from '@defra/forms-model'
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { AnyFormRequest, OnRequestCallback } from '~/src/server/plugins/engine/types.js'
 * @import { FormResponseToolkit } from '~/src/server/routes/types.js'
 * @import { Services } from '~/src/server/types.js'
 */
