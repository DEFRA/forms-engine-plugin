// List summary GET route
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'

import { redirectOrMakeHandler } from '~/src/server/plugins/engine/handlers/index.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

export function getHandler(
  request: FormRequest,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>
) {
  const { params } = request

  return redirectOrMakeHandler(request, h, (page, context) => {
    if (!(page instanceof RepeatPageController)) {
      throw Boom.notFound(`No repeater page found for /${params.path}`)
    }

    return page.makeGetListSummaryRouteHandler()(request, context, h)
  })
}

export function postHandler(
  request: FormRequestPayload,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>
) {
  const { params } = request

  return redirectOrMakeHandler(request, h, (page, context) => {
    const { isForceAccess } = context

    if (isForceAccess || !(page instanceof RepeatPageController)) {
      throw Boom.notFound(`No repeater page found for /${params.path}`)
    }

    return page.makePostListSummaryRouteHandler()(request, context, h)
  })
}
