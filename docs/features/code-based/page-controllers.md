# Custom page controllers

Custom page controllers let you attach bespoke server-side logic to a specific page in your form — for example, fetching data from an external service before render, running an authorisation check, intercepting form submission, or writing additional data to session state.

Use a custom controller when you need server-side behaviour that cannot be expressed through configuration alone. If you want to avoid writing TypeScript altogether, consider instead:

- [Page views](./page-views.md) — to override the Nunjucks template for a page
- [Page events](../configuration-based/page-events.md) — to call an API or inject data on page load or save, without writing code

## Choosing a base class

Two base classes are available:

| Base class               | Import                                                             | Use when                                                                                             |
| ------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `QuestionPageController` | `@defra/forms-engine-plugin/controllers/QuestionPageController.js` | Your page has form components with validation and state. This covers most use cases.                 |
| `PageController`         | `@defra/forms-engine-plugin/controllers/PageController.js`         | Your page is display-only with no form submission — for example a static message page or a redirect. |

Most custom controllers extend `QuestionPageController`. Use `PageController` only when you need a fully bespoke page with no standard question page behaviour.

## What QuestionPageController gives you

`QuestionPageController` has validation, state management, and routing logic built in. When you extend it, you get this behaviour for free and only need to override the parts relevant to your use case:

- **Schema validation** — the components declared in the form definition have their Joi schemas combined automatically. On POST, the payload is validated before your handler runs. If validation fails, `context.errors` is populated and the page is re-rendered with error messages.
- **Session state** — `context.state` is pre-populated from the session cache before your handler is called. The `setState()` and `mergeState()` methods write back to the cache.
- **Conditional routing** — `getNextPath(context)` evaluates any conditions defined in the form and returns the correct path for the next page.
- **Back link** — the back link is generated automatically based on the user's navigation history.
- **Save and exit** — if `allowSaveAndExit` is `true` and the `saveAndExit` plugin option is configured, the secondary button and its handler are wired up for you.

## Registering a custom controller

Pass a `controllers` object to the plugin options when registering the plugin. The key is the string you will set as the `controller` property in your form definition:

```ts
import { plugin } from '@defra/forms-engine-plugin'
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'

class EligibilityCheckController extends QuestionPageController {
  // ...
}

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

Then in your form definition, set `controller` to the same key:

```json
{
  "path": "/eligibility-check",
  "title": "Check your eligibility",
  "controller": "EligibilityCheckController",
  "components": []
}
```

The engine resolves built-in controller names first (such as `"TerminalPageController"` or `"SummaryPageController"`), then falls back to your `controllers` object. If no match is found, an error is thrown at startup.

## Examples

### Fetching data for the view model

Override `makeGetRouteHandler()` to fetch data before the page renders and pass it to your Nunjucks template. Call `this.getViewModel()` to build the standard model, then spread in your additional data:

```ts
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'

import type { FormContext, FormRequest, FormResponseToolkit } from '@defra/forms-engine-plugin/types'

class SelectHoldingController extends QuestionPageController {
  makeGetRouteHandler() {
    return async (request: FormRequest, context: FormContext, h: FormResponseToolkit) => {
      const sbi = context.state.sbi as string

      // Fetch available holdings for this SBI from an external service
      const holdings = await getHoldingsForSbi(sbi)

      // Build the standard view model and add the fetched data
      const viewModel = this.getViewModel(request, context)

      return h.view(this.viewName, { ...viewModel, holdings })
    }
  }
}
```

Your Nunjucks template can then reference `{{ holdings }}`.

### Intercepting the GET handler

Override `makeGetRouteHandler()` to run a check before the page renders and redirect if needed. Delegate to `super` when the check passes to preserve the standard rendering behaviour:

```ts
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'

import type { FormContext, FormRequest, FormResponseToolkit } from '@defra/forms-engine-plugin/types'

class ParcelCheckController extends QuestionPageController {
  makeGetRouteHandler() {
    return async (request: FormRequest, context: FormContext, h: FormResponseToolkit) => {
      const isAuthorised = await checkParcelAuthorisation(request)

      if (!isAuthorised) {
        return h.redirect(this.getHref('/unauthorised'))
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

class HoldingLookupController extends QuestionPageController {
  makePostRouteHandler() {
    return async (request: FormRequestPayload, context: FormContext, h: FormResponseToolkit) => {
      // Re-render with component validation errors if any
      if (context.errors) {
        const viewModel = this.getViewModel(request, context)
        return h.view(this.viewName, viewModel)
      }

      const holdingNumber = context.payload.holdingNumber as string

      // Validate the submitted value against an external service
      const holding = await getHoldingDetails(holdingNumber)

      if (!holding) {
        // Re-render with a custom error — the input passed component validation
        // (format/required checks) but was not found in the external system
        const viewModel = this.getViewModel(request, context)
        viewModel.errors = [{ text: 'Holding number not recognised. Check and try again.' }]
        return h.view(this.viewName, viewModel)
      }

      // Save the standard component state to the session
      await this.setState(request, context.state)

      // Merge additional data from the external lookup into the session
      // so it is available to later pages in the journey
      await this.mergeState(request, context.state, {
        holdingName: holding.name,
        holdingType: holding.type
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

## Overridable members

| Member                           | Description                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewName`                       | The Nunjucks template rendered for this page. Defaults to `'index'`. Set `view` on the page definition to override.                                               |
| `allowSaveAndExit`               | Whether the "Save and exit" button is shown. `true` on `QuestionPageController`, `false` on `PageController`. Override as a class property to change the default. |
| `getViewModel(request, context)` | Returns the view model passed to the Nunjucks template. Override to add or modify properties synchronously. Only available on `QuestionPageController`.           |
| `makeGetRouteHandler()`          | Returns the async GET handler function. Override to control page load behaviour, including async data fetching.                                                   |
| `makePostRouteHandler()`         | Returns the async POST handler function. Override to control form submission behaviour and write custom data to state.                                            |
