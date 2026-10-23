# Migrating from v4 to v5

This guide lists the changes you must make to move an application from `@defra/forms-engine-plugin` v4 to v5. For new capabilities in v5, such as [multi-language support](./features/multi-language), see [Features](./features).

v5 renders all plugin text through a per-request translator, so that each page can be shown in the user's language. Most of the changes below follow from that: methods that build text now take a `Translator`. If your application only registers the plugin and supplies form definitions, sections 1 and 2 are the only ones that apply to you.

| If your application...                                                     | Read                                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Runs the plugin                                                            | [Node.js and npm](#1-nodejs-and-npm)                                  |
| Depends on `@defra/forms-model` or Joi                                     | [forms-model and Joi](#2-forms-model-and-joi)                         |
| Has custom components                                                      | [Custom components](#3-custom-components)                             |
| Has custom page controllers                                                | [Custom page controllers](#4-custom-page-controllers)                 |
| Catches errors when it builds a `FormModel`                                | [Invalid form definition errors](#5-invalid-form-definition-errors)   |
| Uses `FormAdapterSubmissionSchemaVersion` as a type                        | [Submission schema version](#6-submission-schema-version)             |
| Reads Yes/No list text or the confirmation title from the model            | [Text stored as translation keys](#7-text-stored-as-translation-keys) |
| Imports from `@defra/forms-engine-plugin/engine/*` or builds `FormContext` | [Engine internals](#8-engine-internals)                               |

## 1. Node.js and npm

v5 requires Node.js `^24.19.0` and npm `^11.17.0 || >=12.0.2`. Update your `.nvmrc`, `Dockerfile` and `engines` field to match.

## 2. forms-model and Joi

v5 depends on `@defra/forms-model` `^4.0.0` and Joi `^18`. If your application depends on either package, update it to the same major version, so that a single copy of each is installed and the types match:

```sh
npm install @defra/forms-engine-plugin@^5 @defra/forms-model@^4
# Only if your application depends on Joi
npm install joi@^18
```

forms-model v4 uses the Joi 18 types. Joi 18 types array schemas by the array type, for example `ArraySchema<string[]>` where Joi 17 used `ArraySchema<string>`. Update any annotations in your code that use these types.

## 3. Custom components

Methods on `FormComponent` and `ComponentCollection` that produce text now take a `Translator`. Update any overrides and any direct calls:

| v4                                                         | v5                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `getViewModel(payload, errors)`                            | `getViewModel({ payload, errors, translator, isForceAccess })`      |
| `getErrors(errors)`                                        | `getErrors(translator, errors)`                                     |
| `getFirstError(errors)`                                    | `getFirstError(translator, errors)`                                 |
| `getViewErrors(errors)`                                    | `getViewErrors(translator, errors)`                                 |
| `getDisplayStringFromState(state)`                         | `getDisplayStringFromState(state, translator)`                      |
| `getDisplayStringFromFormValue(value)`                     | `getDisplayStringFromFormValue(value, translator)`                  |
| `ComponentCollection.getViewModel(payload, errors, query)` | `ComponentCollection.getViewModel({ payload, errors, translator })` |
| `ComponentCollection.validate(value)`                      | `ComponentCollection.validate(value, translator)`                   |

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
  return { ...viewModel, label: { text: tComponent(this.def, 'title') || this.title } }
}
```

Use the translator's helpers to resolve form content in the user's language: `tComponent(this.def, 'title')`, `tListItem(item, 'text')` and so on. Each component now holds its definition in `this.def` for this purpose. `translator.t` resolves only the plugin's own keys, such as `common.optional`.

## 4. Custom page controllers

Page controllers get the translator for the current request from `this.getTranslator(request)`. Pass it to the methods that build the view model:

| v4                                      | v5                                                  |
| --------------------------------------- | --------------------------------------------------- |
| `getViewModel(request, context)`        | `getViewModel(request, context, translator)`        |
| `getSummaryViewModel(request, context)` | `getSummaryViewModel(request, context, translator)` |
| `getBackLink(request, context)`         | `getBackLink(request, context, translator.t)`       |
| `getErrors(details)`                    | `getErrors(details, translator.language)`           |
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
    viewModel.errors = this.collection.getViewErrors(translator, viewModel.errors)
    return h.view(this.viewName, viewModel)
  }
}
```

`translator.t` resolves only the plugin's own keys. If your controller adds its own text to the view model, translate it with your application's own translations and `translator.language`, so that it follows the user's language.

## 5. Invalid form definition errors

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

## 6. Submission schema version

`FormAdapterSubmissionSchemaVersion` is a constant object, so that its values are always numbers. Code that reads a value, such as `FormAdapterSubmissionSchemaVersion.V1`, works as before. Code that uses it as a type must derive the type from the object:

```ts
import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/types'

type SchemaVersion =
  (typeof FormAdapterSubmissionSchemaVersion)[keyof typeof FormAdapterSubmissionSchemaVersion]
```

## 7. Text stored as translation keys

The plugin stores some built-in text as translation keys and resolves them when it renders the page:

| Text                                     | Value in the model                 |
| ---------------------------------------- | ---------------------------------- |
| Yes/No list item "Yes"                   | `components.yesNoField.yes`        |
| Yes/No list item "No"                    | `components.yesNoField.no`         |
| Confirmation page title "Form submitted" | `pages.confirmation.formSubmitted` |

If your code or templates read these values from `model.lists` or `model.def`, resolve them with the translator, for example `translator.tListItem(item, 'text')`.

## 8. Engine internals

These changes affect code that imports from `@defra/forms-engine-plugin/engine/*` or builds plugin objects by hand, for example in tests:

- `getAnswer(field, state, options)` is `getAnswer(field, state, translator, options)`.
- `getError(detail)` and `getErrors(details)` in `engine/helpers.js` take the language first: `getError(language, detail)` and `getErrors(language, details)`.
- `FormContext` has two more required properties: `languages` and `translator`.
- `setPageTitles` is removed from `engine/helpers.js`. The plugin leaves the definition unchanged and gives a page with no title the title of its first question when it renders the page. Code that read `page.title` from `model.def` after the model was built gets the value from the definition, which can be empty.
- `engine/components/constants.js` is removed. Use `translator.t('common.optional')` in place of `optionalText`. `optionalText` was `' (optional)'` with a leading space, and the translation is `'(optional)'` with no space.
