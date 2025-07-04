import { renderMacro } from '~/test/helpers/component-helpers.js'

describe('Tag environment component', () => {
  let $component = /** @type {HTMLElement | null} */ (null)

  beforeEach(() => {
    const { container } = renderMacro(
      'appTagEnv',
      'components/tag-env/macro.njk',
      { params: { env: 'Devtool' } }
    )

    $component = container.getByRole('strong')
  })

  it('should render contents', () => {
    expect($component).toBeInTheDocument()
    expect($component).toHaveClass('govuk-tag')
  })

  it('should have text content', () => {
    expect($component).toHaveTextContent('Devtool')
  })

  it('should use environment colour', () => {
    expect($component).toHaveClass(`govuk-tag--grey`)
  })
})
