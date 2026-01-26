import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { EXTERNAL_STATE_APPENDAGE } from '~/src/server/constants.js'
import { createPaymentService } from '~/src/server/plugins/payment/helper.js'

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
 * Validates session data and retrieves payment status
 * @param {Request} request - the request
 * @param {string} uuid - the payment UUID
 * @returns {Promise<{ session: PaymentSessionData, sessionKey: string, paymentStatus: GetPaymentResponse }>}
 */
async function getPaymentContext(request, uuid) {
  const sessionKey = `${PAYMENT_SESSION_PREFIX}${uuid}`
  const session = /** @type {PaymentSessionData | null} */ (
    request.yar.get(sessionKey)
  )

  if (!session) {
    throw Boom.badRequest(`No payment session found for uuid=${uuid}`)
  }

  const { paymentId, isLivePayment, formId } = session

  if (!paymentId) {
    throw Boom.badRequest('No paymentId in session')
  }

  const paymentService = createPaymentService(isLivePayment, formId)
  const paymentStatus = await paymentService.getPaymentStatus(paymentId)

  return { session, sessionKey, paymentStatus }
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
 * Payment session data stored when dispatching to GOV.UK Pay
 * @typedef {object} PaymentSessionData
 * @property {string} uuid - unique identifier for this payment attempt
 * @property {string} formId - id of the form
 * @property {string} reference - form reference number
 * @property {number} amount - amount in pounds
 * @property {string} description - payment description
 * @property {string} paymentId - GOV.UK Pay payment ID
 * @property {string} componentName - name of the PaymentField component
 * @property {string} returnUrl - URL to redirect to after successful payment
 * @property {string} failureUrl - URL to redirect to after failed/cancelled payment
 * @property {boolean} isLivePayment - whether the payment is using live API key
 */

/**
 * @import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 * @import { GetPaymentResponse } from '~/src/server/plugins/payment/types.js'
 * @import { ExternalStateAppendage, FormState } from '~/src/server/plugins/engine/types.js'
 */
