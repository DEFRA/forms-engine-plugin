import { server } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import { type FormRequest } from '~/src/server/routes/types.js'

export function makeFormRequest(request: FormRequest): FormRequest {
  return {
    ...request,
    server
  } as FormRequest
}

export function makeFormContextRequest(
  request: FormContextRequest
): FormContextRequest {
  return {
    ...request,
    server
  } as FormContextRequest
}
