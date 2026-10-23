# Migrating from v4 to v5

This guide lists the changes you must make to move an application from `@defra/forms-engine-plugin` v4 to v5. For new capabilities in v5, such as [multi-language support](./features/multi-language), see [Features](./features).

v5 renders all plugin text through a per-request translator, so that each page can be shown in the user's language. Most of the breaking changes follow from that: methods that build text now take a `Translator`. If your application only registers the plugin and supplies form definitions, only the Node.js and npm change applies to you.

## Breaking changes

| Change                                                                                               | Applies to                                                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Node.js `^24.19.0` and npm `^11.17.0 \|\| >=12.0.2`](#nodejs-and-npm)                               | All applications                                                          |
| [Joi 18 schemas](#joi-18-schemas)                                                                    | Applications that build Joi schemas that the plugin combines with its own |
| [Component methods take a `Translator`](#custom-components)                                          | Custom components, and code that calls component methods                  |
| [Page controller methods take a `Translator`](#custom-page-controllers)                              | Custom page controllers                                                   |
| [`SchemaValidationError` for invalid definitions](#invalid-form-definition-errors)                   | Code that catches errors when it builds a `FormModel`                     |
| [`FormAdapterSubmissionSchemaVersion` is a constant object](#submission-schema-version)              | TypeScript code that uses it as a type                                    |
| [Yes/No list text and the confirmation title are translation keys](#text-stored-as-translation-keys) | Code or templates that read this text from the model                      |
| [Changed engine internals](#engine-internals)                                                        | Code that imports from `@defra/forms-engine-plugin/engine/*`, and tests   |

## Node.js and npm

v5 supports Node.js `^24.19.0` and npm `^11.17.0 || >=12.0.2`. npm warns about other versions, and refuses to install with `engine-strict`. Update your `.nvmrc`, `Dockerfile` and `engines` field to match.

## Joi 18 schemas

The plugin uses Joi 18. Joi refuses to combine schemas from different major versions, with the error `Cannot mix different versions of joi schemas`. If your application builds Joi schemas that the plugin combines with its own, for example the `formSchema` of a custom component, build them with Joi 18. If you build them from `@defra/forms-model` schemas, use forms-model v4, which uses Joi 18:

```sh
npm install joi@^18 @defra/forms-model@^4
```

In TypeScript, Joi 18 types array schemas by the array type, for example `ArraySchema<string[]>` where Joi 17 used `ArraySchema<string>`. Update any annotations in your code that use these types.

## Custom components

Methods on `FormComponent` and `ComponentCollection` that produce text now take a `Translator`, which is required:

| v4                                                         | v5                                                                  | What to change      |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| `getViewModel(payload, errors)`                            | `getViewModel({ payload, errors, translator, isForceAccess })`      | Overrides and calls |
| `getErrors(errors)`                                        | `getErrors(translator, errors)`                                     | Overrides and calls |
| `getFirstError(errors)`                                    | `getFirstError(translator, errors)`                                 | Overrides and calls |
| `getViewErrors(errors)`                                    | `getViewErrors(translator, errors)`                                 | Overrides and calls |
| `getDisplayStringFromState(state)`                         | `getDisplayStringFromState(state, translator)`                      | Calls               |
| `getDisplayStringFromFormValue(value)`                     | `getDisplayStringFromFormValue(value, translator)`                  | Calls               |
| `ComponentCollection.getViewModel(payload, errors, query)` | `ComponentCollection.getViewModel({ payload, errors, translator })` | Calls               |

The `translator` comes first in `getErrors`, `getFirstError` and `getViewErrors`, so an override with the v4 parameters receives the translator in place of the errors. `getDisplayStringFromState` and `getDisplayStringFromFormValue` add the translator at the end, so an override that does not use it keeps working, but each call must pass it.

`getViewModel` takes a single `RenderContext` object, exported from `@defra/forms-engine-plugin/engine/components/types.js`.

Before:

```ts
getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
  const viewModel = super.getViewModel(payload, errors)
  return { ...viewModel, label: { text: this.title } }
}
```

After:

```ts
getViewModel(context: RenderContext) {
  const viewModel = super.getViewModel(context)
  const { tComponent } = context.translator
  return {
    ...viewModel,
    label: { text: tComponent(this.def, 'title') || this.title }
  }
}
```

Use the translator's helpers to resolve form content in the user's language: `tComponent(this.def, 'title')`, `tListItem(item, 'text')` and so on. Each component now holds its definition in `this.def` for this purpose. `translator.t` resolves only the plugin's own keys, such as `common.optional`.

## Custom page controllers

Page controllers get the translator for the current request from `this.getTranslator(request)`. These methods now require it:

| v4                                      | v5                                                  |
| --------------------------------------- | --------------------------------------------------- |
| `getViewModel(request, context)`        | `getViewModel(request, context, translator)`        |
| `getSummaryViewModel(request, context)` | `getSummaryViewModel(request, context, translator)` |
| `getBackLink(request, context)`         | `getBackLink(request, context, translator.t)`       |
| `this.collection.getViewErrors(errors)` | `this.collection.getViewErrors(translator, errors)` |

Before:

```ts
makeGetRouteHandler() {
  return async (request, context, h) => {
    const viewModel = this.getViewModel(request, context)
    viewModel.errors = this.collection.getViewErrors(viewModel.errors)
    return h.view(this.viewName, viewModel)
  }
}
```

After:

```ts
makeGetRouteHandler() {
  return async (request, context, h) => {
    const translator = this.getTranslator(request)
    const viewModel = this.getViewModel(request, context, translator)
    viewModel.errors = this.collection.getViewErrors(
      translator,
      viewModel.errors
    )
    return h.view(this.viewName, viewModel)
  }
}
```

`translator.t` resolves only the plugin's own keys. If your controller adds its own text to the view model, translate it with your application's own translations and `translator.language`, so that it follows the user's language.

## Invalid form definition errors

`new FormModel(...)` throws a `SchemaValidationError` when the definition fails schema validation. The original Joi `ValidationError` is on `error.cause`.

Before:

```ts
try {
  model = new FormModel(definition, options)
} catch (err) {
  if (err.isJoi) {
    logger.error(err.details)
  }
}
```

After:

```ts
import {
  InvalidFormDefinitionError,
  SchemaValidationError
} from '@defra/forms-engine-plugin/engine/errors.js'

try {
  model = new FormModel(definition, options)
} catch (err) {
  if (err instanceof SchemaValidationError) {
    logger.error(err.cause.details)
  } else if (err instanceof InvalidFormDefinitionError) {
    logger.error(err.message)
  }
}
```

All errors caused by an invalid definition extend `InvalidFormDefinitionError`. See [Form definition errors](./definition-errors) for the full list.

## Submission schema version

`FormAdapterSubmissionSchemaVersion` is a constant object, so that its values are always numbers. Code that reads a value, such as `FormAdapterSubmissionSchemaVersion.V1`, works as before. Code that uses it as a type must derive the type from the object:

```ts
import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/types'

type SchemaVersion =
  (typeof FormAdapterSubmissionSchemaVersion)[keyof typeof FormAdapterSubmissionSchemaVersion]
```

## Text stored as translation keys

The plugin stores some built-in text as translation keys and resolves them when it renders the page:

| Text                                             | Value in the model                 |
| ------------------------------------------------ | ---------------------------------- |
| Yes/No list item "Yes"                           | `components.yesNoField.yes`        |
| Yes/No list item "No"                            | `components.yesNoField.no`         |
| Default confirmation page title "Form submitted" | `pages.confirmation.formSubmitted` |

If your code or templates read these values from `model.lists` or `model.pages`, resolve them with the translator, for example `translator.tListItem(item, 'text')`.

## Engine internals

These changes affect code that imports from `@defra/forms-engine-plugin/engine/*` or builds plugin objects by hand, for example in tests:

- `getAnswer(field, state, options)` is `getAnswer(field, state, translator, options)`. The translator is required.
- `getError(detail)` and `getErrors(details)` in `engine/helpers.js` take the language first: `getError(language, detail)` and `getErrors(language, details)`. Pass `undefined` for English.
- `FormContext` has two more required properties: `languages` (an array, empty for English only forms) and `translator` (a `Translator` or `undefined`).
- `setPageTitles` is removed from `engine/helpers.js`. The plugin leaves the definition unchanged and gives a page with no title the title of its first question when it renders the page. Code that read `page.title` from `model.def` after the model was built gets the value from the definition, which can be empty.
- `engine/components/constants.js` is removed. Use `translator.t('common.optional')` in place of `optionalText`. `optionalText` was `' (optional)'` with a leading space, and the translation is `'(optional)'` with no space.
