import { getErrorMessage } from '@defra/forms-model'
import Joi from 'joi'

import { getUploadStatus } from '~/src/server/plugins/engine/services/uploadService.js'

/**
 * @param {FormRequest} request
 * @param {Pick<ResponseToolkit, 'response'>} h
 */
export async function getHandler(request, h) {
  const { uploadId } = /** @type {{ uploadId: string }} */ (
    /** @type {unknown} */ (request.params)
  )
  try {
    const status = await getUploadStatus(uploadId)

    if (!status) {
      return h.response({ error: 'Status check failed' }).code(400)
    }

    return h.response({
      uploadStatus: status.uploadStatus
    })
  } catch (err) {
    request.logger.error(
      err,
      `[uploadStatusFailed] Upload status check failed for uploadId: ${uploadId} - ${getErrorMessage(err)}`
    )
    return h.response({ error: 'Status check error' }).code(500)
  }
}

/**
 * @returns {ServerRoute<FormRequestRefs>[]}
 */
export function getRoutes() {
  return [
    {
      method: 'get',
      path: '/upload-status/{uploadId}',
      handler: getHandler,
      options: {
        plugins: {
          crumb: false
        },
        validate: {
          params: Joi.object().keys({
            uploadId: Joi.string().guid().required()
          })
        }
      }
    }
  ]
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { FormRequest, FormRequestRefs } from '~/src/server/routes/types.js'
 */
