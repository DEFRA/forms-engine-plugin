import Boom from '@hapi/boom'

import { PAYMENT_SESSION_PREFIX } from '~/src/server/plugins/engine/routes/payment.js'
import { getPaymentApiKey } from '~/src/server/plugins/payment/helper.js'
import { PaymentService } from '~/src/server/plugins/payment/service.js'

/**
 * Validates session data and retrieves payment status
 * @param {Request} request - the request
 * @param {string} uuid - the payment UUID
 * @returns {Promise<{ session: PaymentSessionData, sessionKey: string, paymentStatus: GetPaymentResponse }>}
 */
export async function getPaymentContext(request, uuid) {
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

  const apiKey = getPaymentApiKey(isLivePayment, formId)
  const paymentService = new PaymentService(apiKey)
  const paymentStatus = await paymentService.getPaymentStatus(
    paymentId,
    isLivePayment
  )

  return { session, sessionKey, paymentStatus }
}

/**
 * Builds an object for logging payment information
 * @param {string} action
 * @param {string} outcome
 * @param {string} reason
 * @param {boolean} isLivePayment
 * @param {string} paymentId
 */
export function buildPaymentInfo(
  action,
  outcome,
  reason,
  isLivePayment,
  paymentId
) {
  return {
    event: {
      category: 'payment',
      action,
      outcome,
      reason,
      type: isLivePayment ? 'live' : 'test',
      reference: paymentId
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 * @import { GetPaymentResponse, PaymentSessionData } from '~/src/server/plugins/payment/types.js'
 */
