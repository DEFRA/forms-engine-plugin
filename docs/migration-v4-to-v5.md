# Migrating from v4 to v5

This guide lists the changes you must make to move an application from `@defra/forms-engine-plugin` v4 to v5. For new capabilities in v5, such as [multi-language support](./features/multi-language), see [Features](./features).

v5 keeps the v4 plugin options, service interfaces and page controller methods. New arguments, such as the translator, are optional and come last. Most applications need only the runtime and dependency changes, and the client build changes if they show maps. To show a custom page controller in Welsh, see [Multi-language support](./features/multi-language#translate-text-in-custom-page-controllers).

## Breaking changes

| Change                                                                                  | Applies to                                                            | Effort  |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| [Node.js `^24.19.0` and npm `^11.17.0 \|\| >=12.0.2`](#nodejs-and-npm)                  | All applications                                                      | Small   |
| [forms-model v4 and Joi 18](#forms-model-v4-and-joi-18)                                 | All applications                                                      | Small   |
| [Client build for maps](#client-build-for-maps)                                         | Applications that bundle the plugin's client JavaScript               | Small   |
| [Submission data for location fields](#submission-data-for-location-fields)             | Services that read easting/northing or latitude/longitude answers     | Small   |
| [Submission message schema](#submission-message-schema)                                 | Services that validate submission messages with the plugin's schemas  | Trivial |
| [Blank repeater answers are `null`](#blank-repeater-answers)                            | Services that read `data.repeaters` from submission messages          | Trivial |
| [`SchemaValidationError` for invalid definitions](#invalid-form-definition-errors)      | Code that catches errors when it builds a `FormModel`                 | Trivial |
| [`FormAdapterSubmissionSchemaVersion` is a constant object](#submission-schema-version) | TypeScript code that uses it as a type                                | Trivial |
| [Templates use a `t` global](#templates-use-a-t-global)                                 | Applications that render plugin templates in their own Nunjucks setup | Small   |
| [Text in the default views](#text-in-the-default-views)                                 | Services that depend on the exact text of the confirmation page       | Trivial |
| [Component `getViewModel` takes one object](#component-getviewmodel)                    | Page controllers that call `getViewModel` on `this.collection`        | Trivial |
| [Removed and changed engine internals](#engine-internals)                               | Code that imports from `@defra/forms-engine-plugin/engine/*`          | Trivial |

Read [Deploying v5](#deploying-v5) before you release.

## Node.js and npm

v5 supports Node.js `^24.19.0` and npm `^11.17.0 || >=12.0.2`. npm warns about other versions, and refuses to install with `engine-strict`. Update your `.nvmrc`, `Dockerfile`, CI and `engines` field to match.

## forms-model v4 and Joi 18

The plugin uses `@defra/forms-model` v4 and Joi 18. Upgrade both, so that your application shares the same types, enums and schemas with the plugin:

```sh
npm install @defra/forms-model@^4 joi@^18
```

Joi refuses to combine schemas from different major versions, with the error `Cannot mix different versions of joi schemas`. This applies when your application nests or concatenates a schema from the plugin, such as those in `@defra/forms-engine-plugin/schema.js`, with its own schemas.

In TypeScript, Joi 18 types array schemas by the array type, for example `ArraySchema<string[]>` where Joi 17 used `ArraySchema<string>`. Update any annotations in your code that use these types.

## Client build for maps

The plugin uses `@defra/interactive-map` 0.0.56 and MapLibre 6. If your application bundles `@defra/forms-engine-plugin/shared.js` or `@defra/forms-engine-plugin/maps`, make these changes. They apply also if your forms have no map fields, because `shared.js` includes the map code.

### Ignore the optional map dependencies

Tell webpack to ignore the optional OpenLayers and Esri dependencies of `@defra/interactive-map`, which the plugin does not use:

```js
new webpack.IgnorePlugin({
  resourceRegExp: /^(ol|proj4|@arcgis\/core)(\/|$)/
})
```

### Serve the MapLibre worker

`initMaps` loads the worker from `/assets/interactive-map/maplibre-gl-worker.mjs`. Copy `maplibre-gl/dist/maplibre-gl-worker.mjs` to that path, or pass a different path as `workerPath`:

```js
new CopyPlugin({
  patterns: [
    {
      from: require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'),
      to: 'interactive-map/maplibre-gl-worker.mjs'
    }
  ]
})
```

### Allow the worker in your Content Security Policy

If your Content Security Policy sets `worker-src`, allow `'self'` as well as `blob:`.

### Remove the old map stylesheets

If your stylesheets import the `interact` or `draw-ml` stylesheets of `@defra/interactive-map`, remove those imports. Version 0.0.56 does not have them. To get the plugin's map styles, use `@defra/forms-engine-plugin/maps` in Sass.

### Install one copy of the map package

If your application installs its own copy of `@defra/interactive-map`, use version `^0.0.56-alpha`, so that npm installs only one copy.

## Submission data for location fields

Easting/northing and latitude/longitude answers have a new format in submission data. This applies to the `main` and `repeaters` records sent to the submission service, and to the machine v1 output.

| Field              | v4                                 | v5              |
| ------------------ | ---------------------------------- | --------------- |
| Easting/northing   | `Easting: 12345\nNorthing: 678901` | `12345, 678901` |
| Latitude/longitude | `Latitude: 51.5\nLongitude: -0.12` | `51.5, -0.12`   |

The check answers page and the email show the labels, as before. Machine v2 and adapter v1 output send objects, as before. Update services that read the v4 strings, for example a CSV import.

## Blank repeater answers

In submission messages, a repeater item now has a `null` value for each question that the user left blank. In v4, the item had no key for these questions. This is the same as `data.main`, which already used `null` in v4. The `FormAdapterSubmissionMessageData` type changes to `Record<string, Record<string, RichFormValue | null>[]>` for `repeaters`.

Update services that check whether a key exists, for example with `'field' in item`. Check for `null` instead.

## Submission message schema

The schemas for submission messages, such as `formAdapterSubmissionMessageMetaSchema`, changed:

- `meta.schemaVersion` is required, and must be the number `1`. The string `'V1'` is no longer valid.
- `meta.language`, `meta.auth`, `payment.descriptionInEng` and `conditionEvaluations` are new optional fields. The plugin always sends `meta.language`.

A service that validates v5 messages with the v4 schema rejects `meta.language`, unless it validates with `stripUnknown: true`. Upgrade such services before you release v5. See [Deploying v5](#deploying-v5).

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

`FormAdapterSubmissionSchemaVersion` is a constant object, so that its values are always numbers. Code that reads a value, such as `FormAdapterSubmissionSchemaVersion.V1`, works as before. Reverse lookups, such as `FormAdapterSubmissionSchemaVersion[1]`, return `undefined`. Code that uses it as a type must derive the type from the object:

```ts
import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/types'

type SchemaVersion =
  (typeof FormAdapterSubmissionSchemaVersion)[keyof typeof FormAdapterSubmissionSchemaVersion]
```

## Templates use a t global

The plugin's templates call a `t` function to show text in the user's language. The plugin adds `t` to its own Nunjucks environment.

- If your application renders the plugin's templates or partials in its own Nunjucks environment, call `prepareNunjucksEnvironment(environment, pluginOptions)` from `@defra/forms-engine-plugin` on that environment. It adds `t` and the plugin's other globals and filters.
- If you pass a global named `t` in the plugin's `nunjucks` options, rename it, because it replaces the plugin's `t`.

## Text in the default views

The feedback link on the confirmation page now includes "(takes 30 seconds)" in the link text. In v4 this text came after the link.

The default confirmation page stores its title as the translation key `pages.confirmation.formSubmitted` in `model.pages`. The plugin shows "Form submitted". If your code reads this title from the model, resolve it with `translator.tPage(page.pageDef, 'title')`.

## Component getViewModel

The `getViewModel` method of a component and of a `ComponentCollection` takes one `RenderContext` object in place of separate arguments. The object has these fields:

| Field        | Type                    | Required |
| ------------ | ----------------------- | -------- |
| `payload`    | `FormPayload`           | Yes      |
| `errors`     | `FormSubmissionError[]` | No       |
| `query`      | `FormQuery`             | No       |
| `translator` | `Translator`            | No       |

This affects a custom page controller that builds component view models itself.

Before:

```ts
const components = this.collection.getViewModel(payload, errors, request.query)
```

After:

```ts
const components = this.collection.getViewModel({
  payload,
  errors,
  query: request.query
})
```

## Engine internals

These changes affect code that imports from `@defra/forms-engine-plugin/engine/*`:

- `setPageTitles` is removed from `engine/helpers.js`. The plugin leaves the definition unchanged, and gives a page with no title the title of its first question when it renders the page. A page with no title now has an empty title in `model.def` and in the `meta.definition` of machine output.
- `engine/components/constants.js` is removed. Use `translator.t('common.optional')` in place of `optionalText`. `optionalText` was `' (optional)'` with a leading space, and the translation is `'(optional)'` with no space.
- `unavailableViewModel(metadata)` in `engine/models/unavailable-view-model.js` takes `(metadata, definition, language)`, so that the unavailable page can show the form title in the user's language.
- `getLocationFieldViewModel(component, viewModel, payload, errors)` in `engine/components/LocationFieldHelpers.js` takes `(component, viewModel, context)`, where `context` is a `RenderContext`.
- In the hapi type declarations, `server.plugins['forms-engine-plugin']` has a required `generateReferenceNumber` function. TypeScript test code that builds this object needs the new property.

## Deploying v5

- **Submission services first:** upgrade services that validate submission messages with the v4 schema before you release v5. See [Submission message schema](#submission-message-schema).
- **Postcode lookup in progress:** a user who is in the postcode lookup pages when v5 goes live can see an error page, and must go back to the address question to start the lookup again.
- **Map pages open during the release:** a browser that has the v4 map JavaScript gets errors from the map proxy until the user reloads the page. The proxy takes a `path` parameter in place of `url`. The `id` of each feature in `/api/maps/countries.geojson` is now a number.
