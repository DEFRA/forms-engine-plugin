import {
  type Request,
  type ResponseToolkit,
  type ServerRoute
} from '@hapi/hapi'
import Joi from 'joi'

function randomReference() {
  // Example: 3 groups of 3 digits
  return `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`
}

function randomId() {
  // Example: 32 hex chars
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

export function initiateHandler(request: Request, h: ResponseToolkit) {
  const returnUrl = request.query.returnUrl
  const component = request.query.component

  const data = {
    reference: randomReference(),
    _id: randomId()
  }

  request.yar.set('returnUrl', returnUrl)
  request.yar.set('component', component)
  request.yar.set('data', data)

  return h.response(
    `
    <h1>Simulated external service page</h1>

    <p>You have been generated a reference number: ${data.reference}.</p>

    <form method="post" action="/customer-reference-field/confirm">
      <button type="submit">Confirm</button>
    </form>
    `
  )
}

export function confirmHandler(request: Request, h: ResponseToolkit) {
  const component = request.yar.get('component')
  const data = request.yar.get('data')
  const returnUrl = request.yar.get('returnUrl')

  request.yar.flash(
    'externalStateAppendage',
    JSON.stringify({
      component,
      data
    })
  )

  return h.redirect(returnUrl)
}

export function getRoutes(): ServerRoute[] {
  return [
    {
      method: 'get',
      path: '/customer-reference-field/confirm',
      handler: initiateHandler,
      options: {
        validate: {
          query: Joi.object().keys({
            component: Joi.string().required(),
            returnUrl: Joi.string().uri().required()
          })
        }
      }
    },
    {
      method: 'post',
      path: '/customer-reference-field/confirm',
      handler: confirmHandler
    }
  ]
}
