// Docusaurus client module — runs on every page navigation.
// Re-uses the application's own autocomplete initialisation. any other components that have client-side will need adding here if they need to be fully functional.
// we exclude interactive-map-based components as they're too hard to render in the documentation (they have server-side dependencies that aren't available in the docs environment).

// eslint-disable-next-line no-restricted-imports
import { initAllAutocomplete } from '../../../src/client/javascripts/autocomplete.js'

export function onRouteDidUpdate() {
  initAllAutocomplete()
}
