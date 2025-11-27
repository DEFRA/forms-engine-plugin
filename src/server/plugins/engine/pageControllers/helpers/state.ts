import { getHiddenFields } from '@defra/forms-model'

import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type AnyFormRequest,
  type FormStateValue
} from '~/src/server/plugins/engine/types.js'
import { type FormQuery } from '~/src/server/routes/types.js'
import { type Services } from '~/src/server/types.js'

/**
 * A series of functions that can transform a pre-fill input parameter e.g lookup a form title based on form id
 */
const paramLookupFunctions = {
  formId: async (val: string, services: Services) => {
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
} as Partial<
  Record<
    string,
    (
      val: string,
      services: Services
    ) => Promise<{ key: string; value: string | undefined }>
  >
>

export function stripParam(query: FormQuery, paramToRemove: string) {
  const params = {} as Record<string, FormStateValue | undefined>
  for (const [key, value = ''] of Object.entries(query)) {
    if (key !== paramToRemove) {
      params[key] = value
    }
  }
  return Object.keys(params).length ? (params as FormQuery) : undefined
}

/**
 * Any hidden parameters defined in the FormDefinition may be pre-filled by URL parameter values.
 * Other parameters are ignored for security reasons.
 * @param request
 * @param model
 */
export async function prefillStateFromQueryParameters(
  request: AnyFormRequest,
  model: FormModel
): Promise<boolean> {
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

  const page = model.pages[0] // Any page will do so just take the first one
  const formData = await page.getState(request)
  if (formData.__copiedToState) {
    return false
  }

  // Flag to denote the 'copy to state' has happened, so don't need to do it again
  const params = {
    __copiedToState: 'true'
  } as Record<string, FormStateValue | undefined>

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

  await page.mergeState(request, formData, params)

  return true
}
