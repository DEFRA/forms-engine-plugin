// Docusaurus client module — runs on every page navigation.
// Enhances accessible autocomplete selects rendered in component previews.

export async function onRouteDidUpdate() {
  const elements = document.querySelectorAll(
    '[data-module="govuk-accessible-autocomplete"]:not([data-enhanced="true"])'
  )
  if (!elements.length) return

  const { default: accessibleAutocomplete } =
    await import('accessible-autocomplete')

  for (const container of elements) {
    const select = container.querySelector('select')
    if (select) {
      accessibleAutocomplete.enhanceSelectElement({
        selectElement: select,
        showAllValues: true
      })
      container.setAttribute('data-enhanced', 'true')
    }
  }
}
