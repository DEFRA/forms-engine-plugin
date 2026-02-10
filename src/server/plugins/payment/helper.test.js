import { config } from '~/src/config/index.js'
import {
  formatCurrency,
  formatPaymentDate,
  getPaymentApiKey
} from '~/src/server/plugins/payment/helper.js'

describe('getPaymentApiKey', () => {
  config.set('paymentProviderApiKeyTest', 'TEST-API-KEY')
  const formId = 'form-id'
  process.env['PAYMENT_PROVIDER_API_KEY_LIVE_form-id'] = 'LIVE-API-KEY'
  process.env['PAYMENT_PROVIDER_API_KEY_TEST_form-id'] = 'TEST-API-KEY'

  it('should read test key when non-live form', () => {
    const apiKey = getPaymentApiKey(false, formId)
    expect(apiKey).toBe('TEST-API-KEY')
  })

  it('should read live key when live form', () => {
    const apiKey = getPaymentApiKey(true, formId)
    expect(apiKey).toBe('LIVE-API-KEY')
  })

  it('should throw if TEST key is missing', () => {
    expect(() => getPaymentApiKey(false, 'form-id-missing')).toThrow(
      'Missing payment api key for test form id form-id-missing'
    )
  })

  it('should throw if LIVE key is missing', () => {
    expect(() => getPaymentApiKey(true, 'form-id-missing')).toThrow(
      'Missing payment api key for live form id form-id-missing'
    )
  })
})

describe('formatPaymentDate', () => {
  it('should format ISO date string to en-GB format', () => {
    const result = formatPaymentDate('2025-11-10T17:01:29.000Z')
    expect(result).toBe('10 November 2025 5:01pm')
  })
})

describe('formatCurrency', () => {
  it('should format whole number with currency symbol', () => {
    expect(formatCurrency(10)).toBe('£10.00')
  })

  it('should format decimal amount with currency symbol', () => {
    expect(formatCurrency(99.5)).toBe('£99.50')
  })

  it('should format large amounts with thousand separators', () => {
    expect(formatCurrency(1234.56)).toBe('£1,234.56')
  })

  it('should format very large amounts with thousand separators', () => {
    expect(formatCurrency(20000)).toBe('£20,000.00')
  })
})
