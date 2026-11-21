import { server } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'

const mockYar = {
  flash: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  reset: jest.fn()
}

/**
 * @param {Omit<FormRequest, 'server' | 'yar'>} request
 * @returns {FormRequest}
 */
export function buildFormRequest(request) {
  return /** @type {FormRequest} */ (
    /** @type {unknown} */ ({
      ...request,
      yar: mockYar,
      server
    })
  )
}

/**
 * @param {Omit<FormContextRequest, 'server' | 'yar'>} request
 * @returns {FormContextRequest}
 */
export function buildFormContextRequest(request) {
  return /** @type {FormContextRequest} */ (
    /** @type {unknown} */ ({
      ...request,
      yar: mockYar,
      server
    })
  )
}

/**
 * @import { FormContextRequest } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest } from '~/src/server/routes/types.js'
 */
