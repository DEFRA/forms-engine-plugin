# Multi-language (specifically English and Welsh)

The `engine-plugin` supports multi-languages (if configured).

A small i18next-based translation layer is used to resolve English and Welsh text for plugin UI, form content, and per-form metadata.

Additional languages are configured by adding translations json files and adding a `translations` property under the `metadata` property of the form definition.
You can use the Designer to edit Welsh translations for your form (to insert the necessary values in the `metadata.translations` property).

Currently only English and Welsh are configured but other languages could be added if desired.

## What gets translated

The translator has two layers of text:

- Plugin boilerplate strings, such as labels, error messages, and shared UI text.
- Form-specific strings, such as page titles, component titles, section titles, list item text, and the form title/contact fields.

## Base language setup

The shared i18n instance is created in [src/server/plugins/engine/i18n/index.ts](src/server/plugins/engine/i18n/index.ts).

It loads two built-in resource files:

- `en-GB.json`
- `cy.json`

That instance uses `en-GB` as the fallback language, so if a key is missing in Welsh, English is used instead.

The shared `t()` helper in the same file resolves plugin keys with the requested language and namespace.

## Form-specific translators

Form translators are built in [src/server/plugins/engine/i18n/createFormTranslator.ts](src/server/plugins/engine/i18n/createFormTranslator.ts).

The flow is:

1. Extract base translations from the form definition.
2. Create a fresh i18next instance with the shared plugin resources.
3. Load any form translations from `definition.metadata.translations` into the `form` namespace.
4. Add metadata values such as form title, contact details, privacy notice, and submission guidance as English `form` resources.
5. Return a scoped translator from [src/server/plugins/engine/i18n/createTranslator.ts](src/server/plugins/engine/i18n/createTranslator.ts).

That scoped translator exposes:

- `t(key)` for plugin text and errors
- `tForm(prop)` for form-level fields like title
- `tPage(page, prop)` for page title/repeat title, and guidance
- `tComponent(component, prop)` for component title, hint, content, and related text
- `tSection(section, prop)` for section titles
- `tListItem(item, prop)` for list item text and hint

## Language selection

Language is not auto-detected inside the translator itself. The caller passes the desired language code, typically `en-GB` or `cy`.

Available languages are derived from the form definition in [src/server/plugins/engine/i18n/languages.ts](src/server/plugins/engine/i18n/languages.ts):

- If the form has Welsh translations under `metadata.translations.cy`, the available languages are English and Cymraeg.
- If it does not, the language list is empty.

## Caching

Translator instances are cached for 15 minutes in [src/server/plugins/engine/i18n/form.ts](src/server/plugins/engine/i18n/form.ts).

- `getCachedPluginTranslator()` for external routes such as save-and-exit, privacy, help, and postcode lookup, which need the full form definition.

The cache key includes form id, status, and language, so English and Welsh translators are cached separately.

## Welsh-specific behavior

Welsh support comes from two places:

- The shared `cy.json` plugin resource file for boilerplate text.
- Per-form Welsh translations stored in `definition.metadata.translations.cy`.

There is also a small temporary workaround in [src/server/plugins/engine/i18n/createFormTranslator.ts](src/server/plugins/engine/i18n/createFormTranslator.ts) that injects Welsh yes/no list item text as `Ie` and `Nage`.

## Interpolation

The i18next instances use `[[...]]` interpolation delimiters rather than the default `{{...}}` form.

That means translated strings can include placeholders such as `[[name]]`, which are resolved by i18next when the translator runs.

## Where it is used

Common consumers include:

- Page controllers that render form pages
- Component models that resolve titles, hints, and validation text
- External route handlers such as postcode lookup and save-and-exit

A good example is [src/server/plugins/engine/components/UkAddressField.ts](src/server/plugins/engine/components/UkAddressField.ts), which requests an external-route translator and uses it to render localized address UI.

## Helper usage

### `getCachedPluginTranslator`

This helper is used by external routes that need the full form definition before they can translate labels and metadata correctly.

Current uses:

- [src/server/plugins/postcode-lookup/routes/index.js](src/server/plugins/postcode-lookup/routes/index.js) uses it to translate the postcode lookup journey.
- [src/server/plugins/engine/components/UkAddressField.ts](src/server/plugins/engine/components/UkAddressField.ts) uses it when dispatching the external postcode lookup flow.

Why it exists:

- External routes do not always have a fully built form model in hand, so the helper fetches the form definition first.
- The full definition is needed to load form namespace translations, component labels, and metadata such as the form title and contact details.
- It uses the same 15-minute cache strategy, but keeps the async fetch isolated inside the helper.

## Practical summary

If a Welsh translation exists for a form field, it is loaded from the form definition and used for `cy`.
If it does not exist, the translator falls back to the shared English text.
If a key is missing entirely from the form namespace, the shared plugin namespace and then `en-GB` fallback keep the UI working.
