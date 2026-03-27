import {
  formatCurrency,
  formatPaymentDate
} from '~/src/server/plugins/payment/helper.js'

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
