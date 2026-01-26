import { config } from '~/src/config/index.js'
import {
  formatPaymentAmount,
  formatPaymentDate,
  getPaymentApiKey
} from '~/src/server/plugins/payment/helper.js'

describe('getPaymentApiKey', () => {
  config.set('paymentProviderApiKeyTest', 'TEST-API-KEY')
  const formId = 'form-id'
  process.env['PAYMENT_PROVIDER_API_KEY_LIVE_form-id'] = 'LIVE-API-KEY'

  it('should read test key when non-live form', () => {
    const apiKey = getPaymentApiKey(false, formId)
    expect(apiKey).toBe('TEST-API-KEY')
  })

  it('should read live key when live form', () => {
    const apiKey = getPaymentApiKey(true, formId)
    expect(apiKey).toBe('LIVE-API-KEY')
  })
})

describe('formatPaymentDate', () => {
  it('should format ISO date string to en-GB format', () => {
    const result = formatPaymentDate('2025-11-10T17:01:29.000Z')
    expect(result).toBe('10 November 2025 – 17:01:29')
  })
})

describe('formatPaymentAmount', () => {
  it('should format whole number with two decimal places', () => {
    expect(formatPaymentAmount(10)).toBe('£10.00')
  })

  it('should format decimal amount', () => {
    expect(formatPaymentAmount(99.5)).toBe('£99.50')
  })
})
