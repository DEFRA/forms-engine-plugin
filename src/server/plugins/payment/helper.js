import { format } from 'date-fns'

import { PaymentService } from '~/src/server/plugins/payment/service.js'

export const DEFAULT_PAYMENT_HELP_URL =
  'https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs'

/**
 * Determine which payment API key value to use.
 * If a draft preview form or a live preview form, read the TEST API key value specific to that form.
 * If a live (non-preview) form, read the LIVE API key value specific to that form.
 * @param {boolean} isLivePayment - true if this is a live payment (as opposed to a test one)
 * @param {string} formId - id of the form
 * @returns {string}
 */
export function getPaymentApiKey(isLivePayment, formId) {
  const apiKeyValue = isLivePayment
    ? process.env[`PAYMENT_PROVIDER_API_KEY_LIVE_${formId}`]
    : process.env[`PAYMENT_PROVIDER_API_KEY_TEST_${formId}`]

  if (!apiKeyValue) {
    throw new Error(
      `Missing payment api key for ${isLivePayment ? 'live' : 'test'} form id ${formId}`
    )
  }
  return apiKeyValue
}

/**
 * Creates a PaymentService instance with the appropriate API key
 * @param {boolean} isLivePayment - true if this is a live payment
 * @param {string} formId - id of the form
 * @returns {PaymentService}
 */
export function createPaymentService(isLivePayment, formId) {
  const apiKey = getPaymentApiKey(isLivePayment, formId)
  return new PaymentService(apiKey)
}

/**
 * Formats a payment date for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date string (e.g., "26 January 2026 5:01pm")
 */
export function formatPaymentDate(isoString) {
  return format(new Date(isoString), 'd MMMM yyyy h:mmaaa')
}

/**
 * Formats a payment amount with two decimal places
 * @param {number} amount - amount in pounds
 * @returns {string} Formatted amount (e.g., "£10.00")
 */
export function formatPaymentAmount(amount) {
  return `£${amount.toFixed(2)}`
}
