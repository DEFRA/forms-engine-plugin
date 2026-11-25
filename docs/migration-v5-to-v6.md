# Migrating from v5 to v6

This guide lists the changes you must make to move an application from `@defra/forms-engine-plugin` v5 to v6.

In v6 the plugin's source is JavaScript with JSDoc types, not TypeScript. The plugin does the same things, and it still publishes type declarations (`.d.ts` files) for TypeScript users. `tsc` writes them from the JSDoc types. JavaScript has no syntax for some TypeScript types, so a few published types change form. Applications that use the plugin from JavaScript, or use only its plugin options and page controller methods, need no changes.

## Breaking changes

| Change                                                                      | Applies to                                                                   | Effort  |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------- |
| [Optional class fields are `T \| undefined`](#optional-class-fields)        | TypeScript code that types a plain object as a plugin class                  | Trivial |
| [Interfaces are type aliases](#interfaces-are-type-aliases)                 | TypeScript code that adds members to the plugin's types                      | Small   |
| [`LocationFieldBase` is not `abstract` in the types](#locationfieldbase)    | Code that subclasses `LocationFieldBase`                                     | Trivial |
| [`SchemaValidationError.cause` is enumerable](#schemavalidationerror-cause) | Code that serialises errors with `JSON.stringify` or copies their properties | Trivial |
| [`FileUploadFieldDetailitem` is renamed](#fileuploadfielddetailitem)        | TypeScript code that imports `FileUploadFieldDetailitem`                     | Trivial |
| [`ADDITIONAL_IDENTIFIER` is not an enum](#additional_identifier)            | TypeScript code that uses `ADDITIONAL_IDENTIFIER.Confirmation` as a type     | Trivial |

## Optional class fields

A class field declared in JavaScript is always present, so JSDoc can type it but cannot make it optional. A field that was `id?: string` is now `id: string | undefined` in the type declarations of these classes:

| Class                       | Fields                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ComponentBase`             | `id`, `page`, `schema`, `options`                                                                                                                                                         |
| `List`, `ListFormComponent` | `list`                                                                                                                                                                                    |
| `ComponentCollection`       | `page`, `parent`                                                                                                                                                                          |
| `LocationFieldBase`         | `instructionText`                                                                                                                                                                         |
| `PageController`            | `name`, `id`, `section`, `condition`, `events`, `collection`                                                                                                                              |
| `FormModel`                 | `engine`, `ordnanceSurveyApiKey`, `controllers`                                                                                                                                           |
| `SummaryViewModel`          | `declaration`, `backLink`, `feedbackLink`, `phaseTag`, `errors`, `hasMissingNotificationEmail`, `components`, `paymentState`, `paymentDetails`, `paymentRequired`, `paymentPreAuthorized` |

Code that creates these classes with `new`, or reads their fields, works as before. A plain object typed as one of these classes must now include each field, for example in a test mock.

Before:

```ts
const page: PageController = { path: '/start', title: 'Start' /* … */ }
```

After:

```ts
const page: PageController = {
  path: '/start',
  title: 'Start',
  id: undefined,
  name: undefined
  /* … */
}
```

## Interfaces are type aliases

JavaScript has no interface declaration: every JSDoc type is a type alias. Each interface that the plugin exported is now a type alias with the same shape. This includes every type from `@defra/forms-engine-plugin/types`, such as `PluginOptions` and `FormContext`.

Code that uses these types works as before. TypeScript code can no longer add members to them with declaration merging or module augmentation. Define your own type that extends the plugin's type instead.

Before:

```ts
declare module '@defra/forms-engine-plugin/types' {
  interface PluginOptions {
    myOption?: string
  }
}
```

After:

```ts
import { type PluginOptions } from '@defra/forms-engine-plugin/types'

type MyPluginOptions = PluginOptions & { myOption?: string }
```

## LocationFieldBase

JavaScript has no abstract classes. `LocationFieldBase` is no longer `abstract` in the type declarations, and its methods `getValidationConfig` and `getErrorTemplates` throw `Not implemented` if a subclass does not override them. TypeScript no longer reports a subclass that leaves them out, so check that each of your subclasses implements both methods.

## SchemaValidationError cause

`SchemaValidationError.cause` holds the Joi `ValidationError`, as before, but it is now an enumerable property. Code that lists an error's properties now sees it: `JSON.stringify(error)` includes the validation error, which describes the form definition. Loggers that write only an error's type, message and stack, such as `@elastic/ecs-pino-format`, are not affected.

## FileUploadFieldDetailItem

The type `FileUploadFieldDetailitem`, from `@defra/forms-engine-plugin/engine/types.js`, is now `FileUploadFieldDetailItem`, with a capital "I". Its shape is the same.

Before:

```ts
import { type FileUploadFieldDetailitem } from '@defra/forms-engine-plugin/engine/types.js'
```

After:

```ts
import { type FileUploadFieldDetailItem } from '@defra/forms-engine-plugin/engine/types.js'
```

## ADDITIONAL_IDENTIFIER

`ADDITIONAL_IDENTIFIER`, from `@defra/forms-engine-plugin/cache-service.js`, is now a read-only object rather than a TypeScript enum. Its value has not changed, so `ADDITIONAL_IDENTIFIER.Confirmation` is still `':confirmation'` and the keys the cache service writes are the same as before. As a type, `ADDITIONAL_IDENTIFIER` is now the union of its values: the string `':confirmation'` is accepted wherever that type is expected, and a member such as `ADDITIONAL_IDENTIFIER.Confirmation` can no longer be used as a type on its own.

Before:

```ts
const id: ADDITIONAL_IDENTIFIER.Confirmation = ADDITIONAL_IDENTIFIER.Confirmation
```

After:

```ts
const id: typeof ADDITIONAL_IDENTIFIER.Confirmation =
  ADDITIONAL_IDENTIFIER.Confirmation
```

## Other changes to the type declarations

These changes need no action:

- Some type names are new, because a type defined in a JavaScript module is always exported. Examples are `FormDefinitionTranslation` and the `…Fields` types, such as `FormSubmissionErrorFields`.
- Exported arrow functions appear as `function` declarations, with the same types.
- A subclass's declaration file can leave out a method whose type equals the parent's. The method is still there, through the parent class.
