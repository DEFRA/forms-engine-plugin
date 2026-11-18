import { renderMacro } from '~/test/helpers/component-helpers.js'

describe('Payment field component', () => {
  /**
   * @param {{ text: string } | undefined} label
   */
  function renderPaymentField(label) {
    return renderMacro('PaymentField', 'components/paymentfield.html', {
      params: {
        model: {
          name: 'payment',
          label,
          amount: '£10.00',
          description: 'Licence fee'
        }
      }
    })
  }

  it('shows the label of the field as the heading', () => {
    const { container } = renderPaymentField({ text: 'Pay the licence fee' })

    expect(
      container.getByRole('heading', { name: 'Pay the licence fee', level: 2 })
    ).toBeInTheDocument()
  })

  it('shows a default heading when the field has no label', () => {
    const { container } = renderPaymentField(undefined)

    expect(
      container.getByRole('heading', { name: 'Payment required', level: 2 })
    ).toBeInTheDocument()
  })
})
