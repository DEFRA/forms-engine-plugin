export * as formsService from '~/src/server/plugins/engine/services/formsService.js'
export * as formSubmissionService from '~/src/server/plugins/engine/services/formSubmissionService.js'

export const outputService = {
  /**
   * @param {FormContext} _context
   * @param {FormRequestPayload} _request
   * @param {FormModel} _model
   * @param {string} _emailAddress
   * @param {DetailItem[]} _items
   * @param {SubmitResponsePayload} _submitResponse
   * @returns {Promise<void>}
   */
  async submit(
    _context,
    _request,
    _model,
    _emailAddress,
    _items,
    _submitResponse
  ) {
    // No-op: Notification functionality has been moved to another service
    // TODO: come back to this
    return Promise.resolve()
  }
}

/**
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequestPayload } from '~/src/server/routes/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { DetailItem } from '~/src/server/plugins/engine/models/types.js'
 * @import { SubmitResponsePayload } from '@defra/forms-model'
 */
