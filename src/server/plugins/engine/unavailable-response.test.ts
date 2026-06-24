import Boom from '@hapi/boom'
import {
  type Lifecycle,
  type Request,
  type ResponseToolkit,
  type Server
} from '@hapi/hapi'

import * as availability from '~/src/server/plugins/engine/form-availability.js'
import * as viewModel from '~/src/server/plugins/engine/models/unavailable-view-model.js'
import { registerUnavailableResponse } from '~/src/server/plugins/engine/unavailable-response.js'
import { metadata } from '~/test/fixtures/form.js'

describe('registerUnavailableResponse', () => {
  let mockServer: Server
  let extensionHandler: (
    request: Request,
    h: ResponseToolkit
  ) => ReturnType<Lifecycle.Method>

  beforeEach(() => {
    mockServer = {
      ext: jest.fn().mockImplementation((event, handler) => {
        if (event === 'onPreResponse') {
          extensionHandler = (handler as Lifecycle.Method).bind(null)
        }
      })
    } as unknown as Server

    registerUnavailableResponse(mockServer)
  })

  it('should register an onPreResponse extension', () => {
    expect(mockServer.ext).toHaveBeenCalledWith(
      'onPreResponse',
      expect.any(Function)
    )
  })

  it('should continue if error is not an offline Boom', async () => {
    const mockRequest = { response: Boom.notFound() } as Request
    const mockH = { continue: Symbol('continue') } as unknown as ResponseToolkit

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
    const mockRequest = { response: mockResponse } as Request

    const mockViewResponse = {
      header: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      takeover: jest.fn().mockReturnThis()
    }
    const mockH = {
      view: jest.fn().mockReturnValue(mockViewResponse)
    } as unknown as ResponseToolkit

    const isOfflineBoomSpy = jest
      .spyOn(availability, 'isOfflineBoom')
      .mockReturnValue(true)
    const unavailableViewModelSpy = jest
      .spyOn(viewModel, 'unavailableViewModel')
      .mockReturnValue({
        pageTitle: 'Unavailable',
        formTitle: 'Test',
        organisationName: 'Defra'
      })

    const result = await extensionHandler(mockRequest, mockH)

    expect(availability.isOfflineBoom).toHaveBeenCalledWith(mockResponse)
    expect(viewModel.unavailableViewModel).toHaveBeenCalledWith(metadata)
    expect(mockH.view).toHaveBeenCalledWith('unavailable', {
      pageTitle: 'Unavailable',
      formTitle: 'Test',
      organisationName: 'Defra'
    })
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
