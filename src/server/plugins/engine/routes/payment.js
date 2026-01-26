import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { EXTERNAL_STATE_APPENDAGE } from '~/src/server/constants.js'
import { getPaymentContext } from '~/src/server/plugins/engine/routes/payment-helper.js'

export const PAYMENT_RETURN_PATH = '/payment-callback'
export const PAYMENT_SESSION_PREFIX = 'payment-'

/**
 * Flash form component state after successful payment
 * @param {Request} request - the request
 * @param {PaymentSessionData} session - the session data containing payment state
 * @param {string} paymentId - the payment id from GOV.UK Pay
 */
function flashComponentState(request, session, paymentId) {
  /** @type {PaymentState} */
  const paymentState = {
    paymentId,
    reference: session.reference,
    amount: session.amount,
    description: session.description,
    uuid: session.uuid,
    formId: session.formId,
    isLivePayment: session.isLivePayment,
    preAuth: {
      status: 'success',
      createdAt: new Date().toISOString()
    }
  }

  /** @type {ExternalStateAppendage} */
  const appendage = {
    component: session.componentName,
    data: /** @type {FormState} */ (/** @type {unknown} */ (paymentState))
  }

  request.yar.flash(EXTERNAL_STATE_APPENDAGE, appendage, true)
}

/**
 * Gets the payment routes for handling GOV.UK Pay callbacks
 * @returns {ServerRoute[]}
 */
export function getRoutes() {
  return [getReturnRoute()]
}

/**
 * Handles successful payment states (capturable/success)
 * @param {Request} request - the request
 * @param {ResponseToolkit} h - the response toolkit
 * @param {PaymentSessionData} session - the session data
 * @param {string} sessionKey - the session key
 * @param {string} paymentId - the payment id
 */
function handlePaymentSuccess(request, h, session, sessionKey, paymentId) {
  flashComponentState(request, session, paymentId)
  request.yar.clear(sessionKey)
  return h.redirect(session.returnUrl).code(StatusCodes.SEE_OTHER)
}

/**
 * Handles failed/cancelled/error payment states
 * @param {Request} request - the request
 * @param {ResponseToolkit} h - the response toolkit
 * @param {PaymentSessionData} session - the session data
 * @param {string} sessionKey - the session key
 */
function handlePaymentFailure(request, h, session, sessionKey) {
  request.yar.clear(sessionKey)
  return h.redirect(session.failureUrl).code(StatusCodes.SEE_OTHER)
}

/**
 * Route handler for payment return URL
 * This is called when GOV.UK Pay redirects the user back after payment
 * @returns {ServerRoute}
 */
function getReturnRoute() {
  return {
    method: 'GET',
    path: PAYMENT_RETURN_PATH,
    async handler(request, h) {
      const { uuid } = /** @type {{ uuid: string }} */ (request.query)
      const { session, sessionKey, paymentStatus } = await getPaymentContext(
        request,
        uuid
      )

      /**
       * @see https://docs.payments.service.gov.uk/api_reference/#payment-status-lifecycle
       */
      const { status } = paymentStatus.state

      switch (status) {
        case 'capturable':
        case 'success':
          return handlePaymentSuccess(
            request,
            h,
            session,
            sessionKey,
            session.paymentId
          )

        case 'cancelled':
        case 'failed':
        case 'error':
          return handlePaymentFailure(request, h, session, sessionKey)

        case 'created':
        case 'started':
        case 'submitted': {
          const nextUrl = paymentStatus._links.next_url?.href

          if (!nextUrl) {
            throw Boom.badRequest(
              `Payment in state '${status}' but no next_url available`
            )
          }

          return h.redirect(nextUrl).code(StatusCodes.SEE_OTHER)
        }

        default: {
          const unknownStatus = /** @type {string} */ (status)
          throw Boom.internal(`Unknown payment status: ${unknownStatus}`)
        }
      }
    },
    options: {
      validate: {
        query: Joi.object()
          .keys({
            uuid: Joi.string().uuid().required()
          })
          .required()
      }
    }
  }
}

/**
 * @import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { PaymentSessionData } from '~/src/server/plugins/payment/types.js'
 * @import { PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 * @import { ExternalStateAppendage, FormState } from '~/src/server/plugins/engine/types.js'
 */
