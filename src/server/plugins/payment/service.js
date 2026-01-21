import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { postJson } from '~/src/server/services/httpService.js'

const PAYMENT_BASE_URL = 'https://publicapi.payments.service.gov.uk'
const PAYMENT_ENDPOINT = '/v1/payments'

const logger = createLogger()

export class PaymentService {
  /**
   * Creates a payment request, calls the payment provider, and receives a redirect url and payment id
   * from the payment provider.
   * The call uses 'delayed capture' (aka pre-authorisation) to reserve the user's money in preparation for
   * later taking the money with a capturePayment() call.
   * @param {number} amount - amount of the payment
   * @param {string} description - a description of the payment which will appear on the payment provider's pages
   * @param {string} uuid - unique id to verify the request matches the response
   * @param {string} reference - form reference
   * @param {{ formId: string, slug: string }} metadata
   * @returns {Promise<{ paymentId: string, paymentUrl: string }>}
   */
  async createPayment(amount, description, uuid, reference, metadata) {
    const response = await this.postToPayProvider({
      amount,
      description,
      reference,
      metadata,
      return_url: `http://localhost:3009/register-as-a-unicorn-breeder/summary?uuid=${uuid}`,
      delayed_capture: true
    })

    return {
      paymentId: response.payment_id,
      paymentUrl: response._links.next_url.href
    }
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

  /**
   * Send data to the Pay provider
   * @param {CreatePaymentRequest} payload - data to send
   */
  async postToPayProvider(payload) {
    const postJsonByType =
      /** @type {typeof postJson<CreatePaymentResponse>} */ (postJson)

    const apiKeyTest = config.get('paymentProviderApiKeyTest')

    try {
      const response = await postJsonByType(
        `${PAYMENT_BASE_URL}${PAYMENT_ENDPOINT}`,
        {
          payload,
          headers: {
            Authorization: `Bearer ${apiKeyTest}`
          }
        }
      )

      if (response.payload?.state.status !== 'created') {
        throw new Error('Failed to create payment')
      }

      return response.payload
    } catch (err) {
      const error = /** @type {Error} */ (err)
      logger.error(
        error,
        `[payment] Error creating payment for form-id=${payload.metadata.formId} slug=${payload.metadata.slug} reference=${payload.reference}: ${error.message}`
      )
      throw err
    }
  }
}

/**
 * @import { PaymentStatus } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 * @import { CreatePaymentRequest, CreatePaymentResponse } from '~/src/server/plugins/payment/types.js'
 */
