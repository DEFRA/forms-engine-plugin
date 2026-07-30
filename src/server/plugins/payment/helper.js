import { format } from 'date-fns'

import { toLanguageLocale } from '~/src/server/plugins/engine/helpers.js'
import { PaymentService } from '~/src/server/plugins/payment/service.js'

export const DEFAULT_PAYMENT_HELP_URL =
  'https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs'

const PAYMENT_TEST_API_KEY = 'payment-test-api-key'
const PAYMENT_LIVE_API_KEY = 'payment-live-api-key'

/**
 * Creates a PaymentService instance with the appropriate API key
 * @param {boolean} isLivePayment - true if this is a live payment
 * @param {string} formId - id of the form
 * @param {FormsService} formsService - service to handle form data operations
 * @returns {Promise<PaymentService>}
 */
export async function createPaymentService(
  isLivePayment,
  formId,
  formsService
) {
  const secretName = isLivePayment ? PAYMENT_LIVE_API_KEY : PAYMENT_TEST_API_KEY
  const apiKey = await formsService.getFormSecret(formId, secretName)
  return new PaymentService(apiKey)
}

/**
 * Formats a payment date for display
 * @param {string} isoString - ISO date string
 * @param {string} language - the target language
 * @returns {string} Formatted date string (e.g., "26 January 2026 5:01pm")
 */
export function formatPaymentDate(isoString, language) {
  return formatDateForLanguage(
    new Date(isoString),
    'd MMMM yyyy h:mmaaa',
    language
  )
}

/**
 * Formats a date for display in a specific language.
 * To use additional languages, the appropriate module must be imported from 'date-fns/locale'
 * @param { Date | string } date - the date
 * @param {string} formatMask - the format mask
 * @param {string} language - the target language
 * @returns {string} Formatted date string (e.g., "26 January 2026 5:01pm")
 */
export function formatDateForLanguage(date, formatMask, language) {
  return format(date, formatMask, {
    locale: toLanguageLocale(language)
  })
}

/**
 * Formats a currency amount with thousand separators and two decimal places
 * @param {number} amount - amount in pounds
 * @param {'en-GB'} [locale] - locale for formatting
 * @param {'GBP'} [currency] - currency code
 * @returns {string} Formatted amount (e.g., "£1,234.56")
 */
export function formatCurrency(amount, locale = 'en-GB', currency = 'GBP') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  })

  return formatter.format(amount)
}

/**
 * @import { FormsService } from '~/src/server/types.js'
 */
