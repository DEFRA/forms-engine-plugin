# Multi-language (specifically English and Welsh)

The `engine-plugin` supports multi-languages (if configured).
Additional languages are configured by adding translations json files and adding a `translations` property under the `metadata` property of the form definition.
You can use the Designer to edit Welsh translations for your form (to insert the necessary values in the `metadata.translations` property).

Currently only English and Welsh are configured but other languages could be added if desired.

## Forms engine plugin

The `engine-plugin` handles translations at two levels:

1. Boilerplate text - a translation file per language exists in `plugin` (`en-GB.json` and `cy.json`). These provide English and Welsh for each boilerplate text element, such as the feedback link url and text, or the error summary etc.
2. Dynamic form text - English translations are read from the form definition (such as component title, short description etc), whereas Welsh translations are read from the `metadata.translations.cy` property of the form definition.

The translator is constructed in the constructor of the `FormModel`.

The translator provides a series of functions:

- t(key) - a general translation function that takes a key (for example 'validation.numberMax') and returns either the appropriate English text or Welsh text deending on which is the current language
- tPage(key) - returns the appropriate translations for page elements, such as title, guidance etc.
- tComponent(key) - returns the appropriate translations for components, such as question text, hint, short description etc.
- tSection(key) - returns the appropriate translations for sections
- tListItem(key) - returns the appropriate translations for list items since each list value (e.g from a radio/checkbox etc) must have a translated equivalent
- tForm(key) - returns the appropriate translations for form-level elements. Currently this only handles the form name.
