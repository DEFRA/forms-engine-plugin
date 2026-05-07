// Docusaurus client module — runs on every page navigation.
// Re-uses the application's own autocomplete initialisation rather than duplicating it.

// eslint-disable-next-line no-restricted-imports
import { initAllAutocomplete } from '../../src/client/javascripts/autocomplete.js'

export function onRouteDidUpdate() {
  initAllAutocomplete()
}
