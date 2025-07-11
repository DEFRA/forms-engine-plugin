import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit, type RouteOptions } from '@hapi/hapi'
import Joi from 'joi'

import {
  type FormRequest,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export function getRoutes(getRouteOptions: RouteOptions<FormRequestRefs>) {
  return [
    {
      method: 'get',
      path: '/{slug}/exit',
      handler: (
        request: FormRequest,
        h: Pick<ResponseToolkit, 'redirect' | 'view'>
      ) => {
        const { app } = request
        const { model } = app

        if (!model) {
          throw Boom.notFound('No model found for exit page')
        }

        const returnUrl = request.query.returnUrl

        const exitViewModel = {
          pageTitle: 'Your progress has been saved',
          phaseTag: model.def.phaseBanner?.phase,
          returnUrl
        }

        return h.view('exit', exitViewModel)
      },
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema
          })
        }
      }
    }
  ]
}
