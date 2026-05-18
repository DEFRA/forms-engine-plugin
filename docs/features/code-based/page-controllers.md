# Custom page controllers

Custom page controllers let you attach bespoke server-side logic to a specific page in your form. For example, fetching data from an external service before render, running an authorisation check, intercepting form submission, or writing additional data to session state.

Use a custom controller when you need server-side behaviour that cannot be expressed through configuration alone. If you want to avoid writing TypeScript altogether, explore the [configuration-based options](../configuration-based/index.md) first.

## How it works

Extend one of the built-in base classes, register it with the plugin, then reference it by name in your form definition.

**1. Create a controller class:**

```ts
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'

class EligibilityCheckController extends QuestionPageController {
  makeGetRouteHandler() {
    return async (request, context, h) => {
      // your logic here
      return super.makeGetRouteHandler()(request, context, h)
    }
  }
}
```

**2. Register it with the plugin:**

```ts
import { plugin } from '@defra/forms-engine-plugin'

await server.register({
  plugin,
  options: {
    controllers: {
      EligibilityCheckController
    }
    // ... other options
  }
})
```

**3. Reference it in your form definition:**

```json
{
  "path": "/eligibility-check",
  "title": "Check your eligibility",
  "controller": "EligibilityCheckController",
  "components": []
}
```

The engine resolves built-in controller names first (such as `"TerminalPageController"` or `"SummaryPageController"`), then falls back to your `controllers` object. If no match is found, an error is thrown when the form is loaded.

## Choosing a base class

| Base class               | Use when                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `QuestionPageController` | Your page has form components with validation and state. This covers most use cases.                 |
| `PageController`         | Your page is display-only with no form submission — for example a static message page or a redirect. |

Both are imported from `@defra/forms-engine-plugin/controllers/<ClassName>.js`.

## Examples

- [Custom page controllers](#custom-page-controllers)
  - [How it works](#how-it-works)
  - [Choosing a base class](#choosing-a-base-class)
  - [Examples](#examples)
    - [Fetching data for the view model](#fetching-data-for-the-view-model)
    - [Intercepting the GET handler](#intercepting-the-get-handler)
    - [Writing to state on POST](#writing-to-state-on-post)
    - [Display-only page (no form components)](#display-only-page-no-form-components)
  - [Reference](#reference)
    - [What QuestionPageController gives you](#what-questionpagecontroller-gives-you)
    - [Overridable members](#overridable-members)

> **Note:** Examples that call `h.view()` require Nunjucks to be configured with the correct template paths. See [plugin options](../../plugin-options.md).

### Fetching data for the view model

Override `makeGetRouteHandler()` to fetch data before the page renders and pass it to your Nunjucks template. Call `this.getViewModel()` to build the standard model, then spread in your additional data:

```ts
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'

import type { FormContext, FormRequest, FormResponseToolkit } from '@defra/forms-engine-plugin/types'

class SelectGrantSchemeController extends QuestionPageController {
  makeGetRouteHandler() {
    return async (request: FormRequest, context: FormContext, h: FormResponseToolkit) => {
      const farmType = context.state.farmType

      // Fetch grant schemes available for the user's farm type
      const grantSchemes = await getEligibleGrantSchemes(farmType)

      // Build the standard view model and add the fetched data
      const viewModel = this.getViewModel(request, context)

      return h.view(this.viewName, { ...viewModel, grantSchemes })
    }
  }
}
```

Your Nunjucks template can then reference `{{ grantSchemes }}`.

> **Note:** When you return directly from `makeGetRouteHandler()` without delegating to `super`, you own the full render. Standard GET behaviour — conditional component filtering, flash error handling, and URL pre-population — will not run. If your page relies on any of these, either delegate to `super.makeGetRouteHandler()(request, context, h)` and use a synchronous `getViewModel()` override instead, or replicate the behaviour you need in your handler.

### Intercepting the GET handler

Override `makeGetRouteHandler()` to run a check before the page renders and redirect if needed. Delegate to `super` when the check passes to preserve the standard rendering behaviour:

```ts
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'

import type { FormContext, FormRequest, FormResponseToolkit } from '@defra/forms-engine-plugin/types'

class GrantEligibilityController extends QuestionPageController {
  makeGetRouteHandler() {
    return async (request: FormRequest, context: FormContext, h: FormResponseToolkit) => {
      const isEligible = await checkGrantEligibility(request)

      if (!isEligible) {
        return h.redirect(this.getHref('/not-eligible'))
      }

      return super.makeGetRouteHandler()(request, context, h)
    }
  }
}
```

### Writing to state on POST

Override `makePostRouteHandler()` to validate form input against an external service and store additional data in the session alongside the standard component values.

`context.errors` is populated by the engine before your handler runs. Check it first and re-render immediately if there are component-level validation errors, then apply your own logic:

```ts
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'

import type { FormContext, FormRequestPayload, FormResponseToolkit } from '@defra/forms-engine-plugin/types'

class PassportLookupController extends QuestionPageController {
  makePostRouteHandler() {
    return async (request: FormRequestPayload, context: FormContext, h: FormResponseToolkit) => {
      // Re-render with component validation errors if any
      if (context.errors) {
        const viewModel = this.getViewModel(request, context)
        return h.view(this.viewName, viewModel)
      }

      const passportNumber = context.payload.passportNumber

      // Validate the submitted passport number against an identity service
      const passport = await verifyPassport(passportNumber)

      if (!passport) {
        // Re-render with a custom error — the input passed component validation
        // (format/required checks) but was not found in the external system
        const viewModel = this.getViewModel(request, context)
        viewModel.errors = [{ text: 'Passport number not recognised. Check and try again.' }]
        return h.view(this.viewName, viewModel)
      }

      // Save the standard component state to the session
      await this.setState(request, context.state)

      // Merge additional data from the identity lookup into the session
      // so it is available to later pages in the journey
      await this.mergeState(request, context.state, {
        verifiedName: passport.fullName,
        nationality: passport.nationality
      })

      return this.proceed(request, h, this.getNextPath(context))
    }
  }
}
```

### Display-only page (no form components)

Extend `PageController` for a page with no form submission. Override `makeGetRouteHandler()` and render using `this.viewName` and `this.viewModel`:

```ts
import { PageController } from '@defra/forms-engine-plugin/controllers/PageController.js'

import type { FormContext, FormRequest, FormResponseToolkit } from '@defra/forms-engine-plugin/types'

class IneligiblePageController extends PageController {
  makeGetRouteHandler() {
    return async (_request: FormRequest, _context: FormContext, h: FormResponseToolkit) => {
      return h.view(this.viewName, this.viewModel)
    }
  }
}
```

`this.viewModel` contains the standard page properties (title, phase banner, service URL, feedback link). Set the `view` property on the page definition to use a custom Nunjucks template — see [Page views](./page-views.md).

## Reference

### What QuestionPageController gives you

`QuestionPageController` has validation, state management, and routing logic built in. When you extend it, you get this behaviour for free and only need to override the parts relevant to your use case:

- **Schema validation** — the components declared in the form definition have their Joi schemas combined automatically. On POST, the payload is validated before your handler runs. If validation fails, `context.errors` is populated and the page is re-rendered with error messages.
- **Session state** — `context.state` is pre-populated from the session cache before your handler is called. The `setState()` and `mergeState()` methods write back to the cache.
- **Conditional routing** — `getNextPath(context)` evaluates any conditions defined in the form and returns the correct path for the next page.
- **Back link** — the back link is generated automatically based on the user's navigation history.
- **Save and exit** — if `allowSaveAndExit` is `true` and the `saveAndExit` plugin option is configured, the secondary button and its handler are wired up for you.

### Overridable members

| Member                           | Description                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewName`                       | The Nunjucks template rendered for this page. Defaults to `'index'`. Set `view` on the page definition to override.                                               |
| `allowSaveAndExit`               | Whether the "Save and exit" button is shown. `true` on `QuestionPageController`, `false` on `PageController`. Override as a class property to change the default. |
| `getViewModel(request, context)` | Returns the view model passed to the Nunjucks template. Override to add or modify properties synchronously. Only available on `QuestionPageController`.           |
| `makeGetRouteHandler()`          | Returns the async GET handler function. Override to control page load behaviour, including async data fetching.                                                   |
| `makePostRouteHandler()`         | Returns the async POST handler function. Override to control form submission behaviour and write custom data to state.                                            |
