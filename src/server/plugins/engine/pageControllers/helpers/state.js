import { ControllerType, getHiddenFields } from '@defra/forms-model'

import { getCacheService } from '~/src/server/plugins/engine/helpers.js'
import {
  CURRENT_PAGE_PATH_KEY,
  STATE_NOT_YET_VALIDATED
} from '~/src/server/plugins/engine/index.js'
import { isValidUUID } from '~/src/server/utils/utils.js'

const GUID_LENGTH = 36

/**
 * A series of functions that can transform a pre-fill input parameter e.g lookup a form title based on form id
 */
const paramLookupFunctions =
  /** @type {Partial<Record<string, (val: string, services: Services) => Promise<{ key: string; value: string | undefined }>>>} */ ({
    /**
     * @param {string} val
     * @param {Services} services
     */
    formId: async (val, services) => {
      let formTitle
      if (val) {
        const meta = await services.formsService.getFormMetadataById(val)
        formTitle = meta.title
      }
      return {
        key: 'formName',
        value: formTitle
      }
    }
  })

/**
 * @param {FormQuery} query
 * @param {string} paramToRemove
 */
export function stripParam(query, paramToRemove) {
  const params = /** @type {Record<string, FormStateValue | undefined>} */ ({})
  for (const [key, value = ''] of Object.entries(query)) {
    if (key !== paramToRemove) {
      params[key] = value
    }
  }
  return Object.keys(params).length
    ? /** @type {FormQuery} */ (params)
    : undefined
}

/**
 * Any hidden parameters defined in the FormDefinition may be pre-filled by URL parameter values.
 * Other parameters are ignored for security reasons.
 * @param {AnyFormRequest} request
 * @param {PageControllerClass} page
 * @returns {Promise<boolean>}
 */
export async function prefillStateFromQueryParameters(request, page) {
  const { model } = page

  const hiddenFieldNames = new Set(
    getHiddenFields(model.def).map((field) => field.name)
  )

  if (!hiddenFieldNames.size) {
    return false
  }

  // Remove 'returnUrl' param
  const query = stripParam(request.query, 'returnUrl')

  if (!query) {
    return false
  }

  const params = /** @type {Record<string, FormStateValue | undefined>} */ ({})

  for (const [key, value = ''] of Object.entries(query)) {
    if (hiddenFieldNames.has(key)) {
      const lookupFunc = paramLookupFunctions[key]
      if (lookupFunc) {
        const res = await lookupFunc(value, model.services)
        // Store original value and result
        params[key] = value
        params[res.key] = res.value
      } else {
        params[key] = value
      }
    }
  }

  const formData = await page.getState(request)
  await page.mergeState(request, formData, params)

  return true
}

/**
 * Checks whether the save-and-exit finished on a repeater with partial state
 * @param {FormContext} context - the form context
 * @param {FormModel} model
 */
export function checkSaveAndExitRepeater(context, model) {
  const potentiallyInvalidState =
    /** @type {Record<string, FormValue> | undefined} */ (
      context.state[STATE_NOT_YET_VALIDATED]
    )
  if (!potentiallyInvalidState) {
    return
  }

  const originalPath = potentiallyInvalidState[CURRENT_PAGE_PATH_KEY]

  const repeaterPaths = model.def.pages
    .filter((page) => page.controller === ControllerType.Repeat)
    .map((p) => `/${model.basePath}${p.path}/`)

  if (typeof originalPath !== 'string') {
    return undefined
  }

  const segments = originalPath.split('/')
  const lastSegment = segments.at(-1) ?? ''

  if (!isValidUUID(lastSegment)) {
    return undefined
  }

  const guidStartIndex = originalPath.length - GUID_LENGTH
  const originalPathWithoutGuid = originalPath.substring(0, guidStartIndex)

  if (!repeaterPaths.includes(originalPathWithoutGuid)) {
    return undefined
  }

  return originalPath
}

/**
 * Copies any potentially invalid state into the payload, and removes those values from state
 * NOTE - this method has a side-effect on 'context.state' and 'context.payload'
 * @param {AnyFormRequest} request - the form request
 * @param {FormContext} context - the form context
 */
export async function copyNotYetValidatedState(request, context) {
  const potentiallyInvalidState =
    /** @type {Record<string, FormValue> | undefined} */ (
      context.state[STATE_NOT_YET_VALIDATED]
    )
  if (!potentiallyInvalidState) {
    return
  }

  const originalPath = potentiallyInvalidState[CURRENT_PAGE_PATH_KEY]

  if (originalPath && originalPath === request.url.pathname) {
    context.payload = {
      ...context.payload,
      ...potentiallyInvalidState,
      [CURRENT_PAGE_PATH_KEY]: undefined
    }

    // Remove any temporary 'not yet validated' state now it's been copied to the payload
    if (context.state[STATE_NOT_YET_VALIDATED]) {
      context.state[STATE_NOT_YET_VALIDATED] = undefined
    }

    const cacheService = getCacheService(request.server)
    await cacheService.setState(request, context.state)
  }
}

/**
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { AnyFormRequest, FormContext, FormStateValue, FormValue } from '~/src/server/plugins/engine/types.js'
 * @import { FormQuery } from '~/src/server/routes/types.js'
 * @import { Services } from '~/src/server/types.js'
 */
