import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { EXTERNAL_STATE_APPENDAGE } from '~/src/server/constants.js'
import { PaymentService } from '~/src/server/plugins/payment/service.js'

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
    isLive: session.isLive,
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

      // 1. Get session data using the UUID as the key
      const sessionKey = `${PAYMENT_SESSION_PREFIX}${uuid}`
      const session = /** @type {PaymentSessionData | null} */ (
        request.yar.get(sessionKey)
      )

      if (!session) {
        throw Boom.badRequest(`No payment session found for uuid=${uuid}`)
      }

      // 2. Get payment status from GOV.UK Pay
      const { paymentId, isLive } = session

      if (!paymentId) {
        throw Boom.badRequest('No paymentId in session')
      }

      const paymentService = new PaymentService({ isLive })
      const paymentStatus = await paymentService.getPaymentStatus(paymentId)

      // 3. Handle different payment states based on GOV.UK Pay status lifecycle
      // @see https://docs.payments.service.gov.uk/api_reference/#payment-status-lifecycle
      const { status } = paymentStatus.state

      switch (status) {
        case 'capturable':
          // Pre-auth successful - flash the state and redirect to summary
          flashComponentState(request, session, paymentId)
          request.yar.clear(sessionKey)
          return h.redirect(session.returnUrl).code(StatusCodes.SEE_OTHER)

        case 'success':
          // Payment already captured (shouldn't happen with delayed_capture: true)
          flashComponentState(request, session, paymentId)
          request.yar.clear(sessionKey)
          return h.redirect(session.returnUrl).code(StatusCodes.SEE_OTHER)

        case 'cancelled':
          // User cancelled payment (P0030) - redirect to payment page to retry
          request.yar.clear(sessionKey)
          return h.redirect(session.failureUrl).code(StatusCodes.SEE_OTHER)

        case 'failed':
          // Payment failed (P0010 rejected, P0020 expired, P0040 service cancelled, P0050 provider error)
          // Redirect to payment page to retry
          request.yar.clear(sessionKey)
          return h.redirect(session.failureUrl).code(StatusCodes.SEE_OTHER)

        case 'error':
          // Technical error on GOV.UK Pay side - no funds taken
          // Redirect to payment page to retry
          request.yar.clear(sessionKey)
          return h.redirect(session.failureUrl).code(StatusCodes.SEE_OTHER)

        case 'created':
        case 'started':
        case 'submitted': {
          // User came back too early or payment still processing
          // Redirect back to GOV.UK Pay to continue
          const nextUrl = paymentStatus._links.next_url?.href

          if (nextUrl) {
            return h.redirect(nextUrl).code(StatusCodes.SEE_OTHER)
          }

          throw Boom.badRequest(
            `Payment in state '${status}' but no next_url available`
          )
        }

        default: {
          // this should never be reached but Sonar will complain
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
 * Payment session data stored when dispatching to GOV.UK Pay
 * @typedef {object} PaymentSessionData
 * @property {string} uuid - unique identifier for this payment attempt
 * @property {string} reference - form reference number
 * @property {number} amount - amount in pounds
 * @property {string} description - payment description
 * @property {string} paymentId - GOV.UK Pay payment ID
 * @property {string} componentName - name of the PaymentField component
 * @property {string} returnUrl - URL to redirect to after successful payment
 * @property {string} failureUrl - URL to redirect to after failed/cancelled payment
 * @property {boolean} isLive - whether the payment is using live API key
 */

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 * @import { PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 * @import { ExternalStateAppendage, FormState } from '~/src/server/plugins/engine/types.js'
 */
