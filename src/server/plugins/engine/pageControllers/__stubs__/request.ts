import { server } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import { type FormRequest } from '~/src/server/routes/types.js'

const mockYar = {
  flash: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  reset: jest.fn()
}

export function buildFormRequest(
  request: Omit<FormRequest, 'server' | 'yar'>
): FormRequest {
  return {
    ...request,
    yar: mockYar,
    server
  } as unknown as FormRequest
}

export function buildFormContextRequest(
  request: Omit<FormContextRequest, 'server' | 'yar'>
): FormContextRequest {
  return {
    ...request,
    yar: mockYar,
    server
  } as unknown as FormContextRequest
}
