import Boom from '@hapi/boom'

import { EN_GB } from '~/src/server/constants.js'
import * as availability from '~/src/server/plugins/engine/form-availability.js'
import * as viewModel from '~/src/server/plugins/engine/models/unavailable-view-model.js'
import { registerUnavailableResponse } from '~/src/server/plugins/engine/unavailable-response.js'
import { metadata } from '~/test/fixtures/form.js'

describe('registerUnavailableResponse', () => {
  /** @type {Server} */
  let mockServer
  /** @type {(request: Request, h: ResponseToolkit) => ReturnType<Lifecycle.Method>} */
  let extensionHandler

  beforeEach(() => {
    mockServer = /** @type {Server} */ (
      /** @type {unknown} */ ({
        ext: jest.fn().mockImplementation((event, handler) => {
          if (event === 'onPreResponse') {
            extensionHandler = /** @type {Lifecycle.Method} */ (handler).bind(
              null
            )
          }
        })
      })
    )

    registerUnavailableResponse(mockServer)
  })

  it('should register an onPreResponse extension', () => {
    expect(mockServer.ext).toHaveBeenCalledWith(
      'onPreResponse',
      expect.any(Function)
    )
  })

  it('should continue if error is not an offline Boom', async () => {
    const mockRequest = /** @type {Request} */ ({ response: Boom.notFound() })
    const mockH = /** @type {ResponseToolkit} */ (
      /** @type {unknown} */ ({ continue: Symbol('continue') })
    )

    const isOfflineBoomSpy = jest
      .spyOn(availability, 'isOfflineBoom')
      .mockReturnValue(false)

    const result = await extensionHandler(mockRequest, mockH)
    expect(result).toBe(mockH.continue)
    isOfflineBoomSpy.mockRestore()
  })

  it('should render unavailable view if error is an offline Boom', async () => {
    const offlineData = { offline: true, metadata }
    const mockResponse = Boom.boomify(new Error('offline'), {
      statusCode: 503,
      data: offlineData
    })
    const mockRequest = /** @type {Request} */ ({
      response: mockResponse,
      server: {
        plugins: {
          'forms-engine-plugin': {}
        }
      }
    })

    const mockViewResponse = {
      header: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      takeover: jest.fn().mockReturnThis()
    }
    const mockH = /** @type {ResponseToolkit} */ (
      /** @type {unknown} */ ({
        view: jest.fn().mockReturnValue(mockViewResponse)
      })
    )

    const isOfflineBoomSpy = jest
      .spyOn(availability, 'isOfflineBoom')
      .mockReturnValue(true)
    const unavailableViewModelSpy = jest
      .spyOn(viewModel, 'unavailableViewModel')
      .mockReturnValue({
        pageTitle: 'Unavailable',
        formTitle: 'Test',
        organisationName: 'Defra',
        language: EN_GB,
        languages: [
          { code: 'en-GB', name: 'English' },
          { code: 'cy', name: 'Cymraeg' }
        ],
        context: {
          translator: /** @type {Translator} */ (/** @type {unknown} */ ({}))
        }
      })

    const result = await extensionHandler(mockRequest, mockH)

    expect(availability.isOfflineBoom).toHaveBeenCalledWith(mockResponse)
    expect(viewModel.unavailableViewModel).toHaveBeenCalledWith(
      metadata,
      undefined,
      'en-GB'
    )
    expect(mockH.view).toHaveBeenCalledWith(
      'unavailable',
      expect.objectContaining({
        pageTitle: 'Unavailable',
        formTitle: 'Test',
        organisationName: 'Defra'
      })
    )
    expect(mockViewResponse.header).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, no-cache, must-revalidate'
    )
    expect(mockViewResponse.header).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow'
    )
    expect(mockViewResponse.code).toHaveBeenCalledWith(200)
    expect(mockViewResponse.takeover).toHaveBeenCalled()
    expect(result).toBe(mockViewResponse)

    isOfflineBoomSpy.mockRestore()
    unavailableViewModelSpy.mockRestore()
  })
})

/**
 * @import { Lifecycle, Request, ResponseToolkit, Server } from '@hapi/hapi'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 */
