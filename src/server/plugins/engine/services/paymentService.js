export class PaymentService {
  /**
   * Creates a payment request, calls the payment provider, and receives a redirect url and payment id
   * from the payment provider.
   * The call uses 'delayed capture' (aka pre-authorisation) to reserve the user's money in preparation for
   * later taking the money with a capturePayment() call.
   * @param {number} _amount - amount of the payment
   * @param {string} _description - a description of the payment which will appear on the payment provider's pages
   * @param {string} uuid - unique id to verify the request matches the response
   * @param {{ formId: string, slug: string }} _metadata
   * @returns {Promise<{ paymentId: string, paymentUrl: string }>}
   */
  createPayment(_amount, _description, uuid, _metadata) {
    return Promise.resolve({
      paymentId: '12345abcde',
      paymentUrl: `http://pay-somthing.com?nonce=${uuid}`
    })
  }

  /**
   * Get the status of a payment
   * @param {string} _paymentId - payment id (returned from createPayment() call)
   * @returns {Promise<PaymentStatus>}
   */
  getPaymentStatus(_paymentId) {
    return Promise.resolve(/** @type {PaymentStatus} */ ({}))
  }

  /**
   * Takes the money reserved by previous pre-authorisation
   * @param {string} _paymentId - payment id (returned from createPayment() call)
   */
  capturePayment(_paymentId) {
    return Promise.resolve(true)
  }
}

/**
 * @import { PaymentStatus } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 */
