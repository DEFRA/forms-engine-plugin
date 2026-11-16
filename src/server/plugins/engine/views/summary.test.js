import { renderView } from '~/test/helpers/component-helpers.js'

describe('Summary view', () => {
  /**
   * @param {Record<string, unknown>} context
   */
  function renderSummary(context) {
    return renderView('summary.html', {
      context: {
        baseLayoutPath: 'govuk/template.njk',
        checkAnswers: [],
        components: [],
        ...context
      }
    })
  }

  it.each([
    { name: 'Submit', context: {} },
    { name: 'Accept and submit', context: { declaration: 'I agree' } },
    { name: 'Pay and submit', context: { paymentRequired: true } },
    {
      name: 'Pay and submit',
      context: { paymentRequired: true, declaration: 'I agree' }
    }
  ])('labels the submit button "$name" for $context', ({ name, context }) => {
    const { container } = renderSummary(context)

    expect(container.getByRole('button', { name })).toBeInTheDocument()
  })
})
