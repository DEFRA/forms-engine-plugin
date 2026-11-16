# Form definition errors

When a form definition cannot be used, the plugin throws an error that extends `InvalidFormDefinitionError`. Check for this base class to tell a problem with the form apart from a problem with your service, for example to show the form author an error page in preview.

```ts
import { InvalidFormDefinitionError } from '@defra/forms-engine-plugin/engine/errors.js'

if (err instanceof InvalidFormDefinitionError) {
  // The form definition is invalid. err.message describes the problem.
}
```

| Error                        | Thrown when                                                                       | Extra properties                                      |
| ---------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `SchemaValidationError`      | The definition fails schema validation                                            | `cause`: the Joi `ValidationError` with its `details` |
| `ConditionBuildError`        | A condition cannot be built, for example because it refers to the wrong component | `conditionName`                                       |
| `UnknownPageControllerError` | A page names a controller that is not built in or registered in `controllers`     | `controllerName`                                      |
| `UnknownComponentTypeError`  | A component has a type with no implementation                                     | `componentType`                                       |

The error messages describe only the form, so that you can show them to form authors.
