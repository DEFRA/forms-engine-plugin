import { config } from '~/src/config/index.js'
import { getPaymentApiKey } from '~/src/server/plugins/payment/helper.js'

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
