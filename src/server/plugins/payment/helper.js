import { config } from '~/src/config/index.js'

/**
 * Determine which payment API key value to use.
 * If a non-live non-preview form, use the TEST API key value.
 * If a live (non-preview) form, read the API key value specific to that form.
 * @param {boolean} isLivePayment - true if this is a live payment (as opposed to a test one)
 * @param {string} formId - id of the form
 * @returns {string}
 */
export function getPaymentApiKey(isLivePayment, formId) {
  const apiKeyValue = isLivePayment
    ? process.env[`PAYMENT_PROVIDER_API_KEY_LIVE_${formId}`]
    : config.get('paymentProviderApiKeyTest')

  if (!apiKeyValue) {
    throw new Error(
      `Missing payment api key for ${isLivePayment ? 'live' : 'test'} form id ${formId}`
    )
  }
  return apiKeyValue
}
