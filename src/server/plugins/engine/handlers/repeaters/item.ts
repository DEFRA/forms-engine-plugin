import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'

import { redirectOrMakeHandler } from '~/src/server/plugins/engine/handlers/index.js'
import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

// Item delete GET route
export function getHandler(
  request: FormRequest,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>
) {
  const { params } = request

  return redirectOrMakeHandler(request, h, (page, context) => {
    if (
      !(
        page instanceof RepeatPageController ||
        page instanceof FileUploadPageController
      )
    ) {
      throw Boom.notFound(`No page found for /${params.path}`)
    }

    return page.makeGetItemDeleteRouteHandler()(request, context, h)
  })
}

// Item delete POST route
export function postHandler(
  request: FormRequestPayload,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>
) {
  const { params } = request

  return redirectOrMakeHandler(request, h, (page, context) => {
    const { isForceAccess } = context

    if (
      isForceAccess ||
      !(
        page instanceof RepeatPageController ||
        page instanceof FileUploadPageController
      )
    ) {
      throw Boom.notFound(`No page found for /${params.path}`)
    }

    return page.makePostItemDeleteRouteHandler()(request, context, h)
  })
}
