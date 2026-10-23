# Migrating from v4 to v5

This guide lists the changes you must make to move an application from `@defra/forms-engine-plugin` v4 to v5. For new capabilities in v5, such as [multi-language support](./features/multi-language), see [Features](./features).

If your application only registers the plugin and supplies form definitions and metadata, only the Node.js and npm change applies to you. Custom page controllers written for v4 work in v5 without change. Custom components that override or call `getViewModel` need one change. To show custom code in Welsh, see [Multi-language support](./features/multi-language#translate-text-in-custom-components-and-page-controllers).

## Breaking changes

| Change                                                                                               | Applies to                                                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Node.js `^24.19.0` and npm `^11.17.0 \|\| >=12.0.2`](#nodejs-and-npm)                               | All applications                                                          |
| [Joi 18 schemas](#joi-18-schemas)                                                                    | Applications that build Joi schemas that the plugin combines with its own |
| [`SchemaValidationError` for invalid definitions](#invalid-form-definition-errors)                   | Code that catches errors when it builds a `FormModel`                     |
| [`FormAdapterSubmissionSchemaVersion` is a constant object](#submission-schema-version)              | TypeScript code that uses it as a type                                    |
| [Yes/No list text and the confirmation title are translation keys](#text-stored-as-translation-keys) | Code or templates that read this text from the model                      |
| [Component `getViewModel` takes one object](#component-getviewmodel)                                 | Custom components that override or call `getViewModel`                    |
| [Removed engine internals](#engine-internals)                                                        | Code that imports from `@defra/forms-engine-plugin/engine/*`              |

## Node.js and npm

v5 supports Node.js `^24.19.0` and npm `^11.17.0 || >=12.0.2`. npm warns about other versions, and refuses to install with `engine-strict`. Update your `.nvmrc`, `Dockerfile` and `engines` field to match.

## Joi 18 schemas

The plugin uses Joi 18. Joi refuses to combine schemas from different major versions, with the error `Cannot mix different versions of joi schemas`. If your application builds Joi schemas that the plugin combines with its own, for example the `formSchema` of a custom component, build them with Joi 18. If you build them from `@defra/forms-model` schemas, use forms-model v4, which uses Joi 18:

```sh
npm install joi@^18 @defra/forms-model@^4
```

In TypeScript, Joi 18 types array schemas by the array type, for example `ArraySchema<string[]>` where Joi 17 used `ArraySchema<string>`. Update any annotations in your code that use these types.

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

## Component getViewModel

A component's `getViewModel` takes one `RenderContext` object in place of separate arguments. The object has these fields:

| Field        | Type                    | Required |
| ------------ | ----------------------- | -------- |
| `payload`    | `FormPayload`           | Yes      |
| `errors`     | `FormSubmissionError[]` | No       |
| `query`      | `FormQuery`             | No       |
| `translator` | `Translator`            | No       |

When you override `getViewModel`, pass the object to `super` unchanged, so that the base class gets every field, including fields that later versions add.

Before:

```ts
getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
  const viewModel = super.getViewModel(payload, errors)
  return { ...viewModel, classes: 'app-farm-reference' }
}
```

After:

```ts
import { type RenderContext } from '@defra/forms-engine-plugin/types'

getViewModel(context: RenderContext) {
  const viewModel = super.getViewModel(context)
  return { ...viewModel, classes: 'app-farm-reference' }
}
```

Code that calls `getViewModel` on a component or a `ComponentCollection` passes an object, for example `component.getViewModel({ payload, errors })`.

## Engine internals

These changes affect code that imports from `@defra/forms-engine-plugin/engine/*`:

- `setPageTitles` is removed from `engine/helpers.js`. The plugin leaves the definition unchanged and gives a page with no title the title of its first question when it renders the page. Code that read `page.title` from `model.def` after the model was built gets the value from the definition, which can be empty.
- `engine/components/constants.js` is removed. Use `translator.t('common.optional')` in place of `optionalText`. `optionalText` was `' (optional)'` with a leading space, and the translation is `'(optional)'` with no space.
