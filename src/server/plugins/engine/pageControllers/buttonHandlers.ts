import Boom from '@hapi/boom'

import {
  getCacheService,
  getSaveAndReturnHelpers
} from '~/src/server/plugins/engine/helpers.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import { type FormRequestPayload } from '~/src/server/routes/types.js'

/**
 * Handle save-and-return action by processing form data and return exit path
 */
export async function handleSaveAndReturn(
  request: FormRequestPayload,
  context: FormContext
): Promise<string> {
  const { state } = context

  // Save the current state and return the exit path
  const saveAndReturn = getSaveAndReturnHelpers(request.server)

  if (!saveAndReturn?.sessionPersister) {
    throw Boom.internal('Server misconfigured for save and return')
  }

  await saveAndReturn.sessionPersister(state, request)

  const cacheService = getCacheService(request.server)
  await cacheService.clearState(request)

  return '/exit'
}
