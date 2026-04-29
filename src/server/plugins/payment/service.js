import { StatusCodes } from 'http-status-codes'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import {
  buildPaymentInfo,
  convertPenceToPounds
} from '~/src/server/plugins/engine/routes/payment-helper.js'
import { get, post, postJson } from '~/src/server/services/httpService.js'

const PAYMENT_BASE_URL = 'https://publicapi.payments.service.gov.uk'
const PAYMENT_ENDPOINT = '/v1/payments'

/**
 * @param {string} apiKey
 * @returns {{ Authorization: string }}
 */
function getAuthHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`
  }
}

export class PaymentService {
  /** @type {string} */
  #apiKey

  /**
   * @param {string} apiKey - API key to use (global config for test value, per-form config for live value)
   */
  constructor(apiKey) {
    this.#apiKey = apiKey
  }

  /**
   * Creates a payment with delayed capture (pre-authorisation)
   * @param {number} amount - in pence
   * @param {string} description
   * @param {string} returnUrl
   * @param {string} reference
   * @param {boolean} isLivePayment
   * @param {{ formId: string, slug: string } | undefined } metadata
   * @param {string} [email] - optional email to prepopulate on GOV.UK Pay
   */
  async createPayment(
    amount,
    description,
    returnUrl,
    reference,
    isLivePayment,
    metadata,
    email
  ) {
    try {
      /** @type {CreatePaymentRequest} */
      const payload = {
        amount,
        description,
        reference,
        metadata,
        return_url: returnUrl,
        delayed_capture: true
      }

      // Prepopulate email on GOV.UK Pay if provided
      if (email) {
        payload.email = email
      }

      const response = await this.postToPayProvider(payload)

      logger.info(
        buildPaymentInfo(
          'create-payment',
          'success',
          `amount=${convertPenceToPounds(amount)}`,
          isLivePayment,
          response.payment_id
        ),
        `[payment] Created payment and user taken to enter pre-auth details for paymentId=${response.payment_id}`
      )

      return {
        paymentId: response.payment_id,
        paymentUrl: response._links.next_url.href
      }
    } catch (err) {
      const error =
        /** @type {{ output?: { payload?: any }, message?: any }} */ (err)
      if (isLivePayment) {
        logger.error(
          error.output?.payload ?? error.message,
          `[payment] Failed to create payment session for reference ${reference}`
        )
      }
    }
    return undefined
  }

  /**
   * @param {string} paymentId
   * @param {boolean} isLivePayment
   * @returns {Promise<GetPaymentResponse>}
   */
  async getPaymentStatus(paymentId, isLivePayment) {
    const getByType = /** @type {typeof get<GetPaymentApiResponse>} */ (get)

    try {
      const response = await getByType(
        `${PAYMENT_BASE_URL}${PAYMENT_ENDPOINT}/${paymentId}`,
        {
          headers: getAuthHeaders(this.#apiKey),
          json: true
        }
      )

      if (response.error) {
        const errorMessage =
          response.error instanceof Error
            ? response.error.message
            : JSON.stringify(response.error)
        throw new Error(`Failed to get payment status: ${errorMessage}`)
      }

      const state = response.payload.state
      logger.info(
        buildPaymentInfo(
          'get-payment-status',
          state.status === 'capturable' || state.status === 'success'
            ? 'success'
            : 'failure',
          `status:${state.status} code:${state.code ?? 'N/A'} message:${state.message ?? 'N/A'}`,
          isLivePayment,
          paymentId
        ),
        `[payment] Got payment status for paymentId=${paymentId}: status=${state.status}`
      )

      return {
        state,
        _links: response.payload._links,
        email: response.payload.email,
        paymentId: response.payload.payment_id,
        amount: response.payload.amount
      }
    } catch (err) {
      const error = /** @type {Error} */ (err)
      logger.error(
        error,
        `[payment] Error getting payment status for paymentId=${paymentId}: ${error.message}`
      )
      throw err
    }
  }

  /**
   * Captures a payment that is in 'capturable' status
   * @param {string} paymentId
   * @param {number} amount
   * @returns {Promise<boolean>}
   */
  async capturePayment(paymentId, amount) {
    try {
      const response = await post(
        `${PAYMENT_BASE_URL}${PAYMENT_ENDPOINT}/${paymentId}/capture`,
        {
          headers: getAuthHeaders(this.#apiKey)
        }
      )

      const statusCode = response.res.statusCode

      if (
        statusCode === StatusCodes.OK ||
        statusCode === StatusCodes.NO_CONTENT
      ) {
        logger.info(
          {
            event: {
              category: 'payment',
              action: 'capture-payment',
              outcome: 'success',
              reason: `amount=${convertPenceToPounds(amount)}`,
              reference: paymentId
            }
          },
          `[payment] Successfully captured payment for paymentId=${paymentId}`
        )
        return true
      }

      logger.error(
        `[payment] Capture failed for paymentId=${paymentId}: HTTP ${statusCode}`
      )
      return false
    } catch (err) {
      const error = /** @type {Error} */ (err)
      logger.error(
        error,
        `[payment] Error capturing payment for paymentId=${paymentId}: ${error.message}`
      )
      throw err
    }
  }

  /**
   * @param {CreatePaymentRequest} payload
   */
  async postToPayProvider(payload) {
    const postJsonByType =
      /** @type {typeof postJson<CreatePaymentResponse>} */ (postJson)

    try {
      const response = await postJsonByType(
        `${PAYMENT_BASE_URL}${PAYMENT_ENDPOINT}`,
        {
          payload,
          headers: getAuthHeaders(this.#apiKey)
        }
      )

      if (response.payload?.state.status !== 'created') {
        throw new Error(
          `Failed to create payment for reference=${payload.reference}`
        )
      }

      return response.payload
    } catch (err) {
      const error = /** @type {Error} */ (err)
      if (!error.message.includes('401 Unauthorized')) {
        logger.error(
          error,
          `[payment] Error creating payment for reference=${payload.reference}: ${error.message}`
        )
      }
      throw err
    }
  }
}

/**
 * @import { CreatePaymentRequest, CreatePaymentResponse, GetPaymentApiResponse, GetPaymentResponse } from '~/src/server/plugins/payment/types.js'
 */
