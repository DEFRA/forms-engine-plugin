import { getErrorMessage } from '@defra/forms-model'
import { type ResponseToolkit, type ServerRoute } from '@hapi/hapi'
import Joi from 'joi'

import { getUploadStatus } from '~/src/server/plugins/engine/services/uploadService.js'
import {
  type FormRequest,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export async function getHandler(
  request: FormRequest,
  h: Pick<ResponseToolkit, 'response'>
) {
  const { uploadId } = request.params as unknown as {
    uploadId: string
  }
  try {
    const status = await getUploadStatus(uploadId)

    if (!status) {
      return h.response({ error: 'Status check failed' }).code(400)
    }

    return h.response({
      uploadStatus: status.uploadStatus
    })
  } catch (error) {
    const errMsg = getErrorMessage(error)
    request.logger.error(
      errMsg,
      `[uploadStatusFailed] Upload status check failed for uploadId: ${uploadId} - ${errMsg}`
    )
    return h.response({ error: 'Status check error' }).code(500)
  }
}

export function getRoutes(): ServerRoute<FormRequestRefs>[] {
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
