# Plugin options

The forms plugin is configured with [registration options](https://hapi.dev/api/?v=21.4.0#plugins)

## Options

| Option                           | Required | Description                                                                                                                                                                          |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nunjucks`                       | Yes      | Template engine configuration. See [nunjucks configuration](#nunjucks-configuration)                                                                                                 |
| `viewContext`                    | Yes      | A function that provides global context to all templates. See [viewContext](#viewcontext)                                                                                            |
| `baseUrl`                        | Yes      | Base URL of the application (protocol and hostname, e.g. `"https://myservice.gov.uk"`). Used for generating absolute URLs in markdown rendering and other contexts                   |
| `model`                          | No       | Pre-built `FormModel` instance. When provided, the plugin serves a single static form definition. When omitted, forms are loaded dynamically via `formsService`. See [model](#model) |
| `services`                       | No       | Object containing `formsService`, `formSubmissionService`, and `outputService`. See [services](#services)                                                                            |
| `controllers`                    | No       | Object map of custom page controllers used to override the default. See [custom controllers](#custom-controllers)                                                                    |
| `globals`                        | No       | A map of custom template globals to include. See [custom globals](#custom-globals)                                                                                                   |
| `filters`                        | No       | A map of custom template filters to include. See [custom filters](#custom-filters)                                                                                                   |
| `cache`                          | No       | Caching options. Recommended for production — either a cache name string or a custom `CacheService` instance. See [custom cache](#custom-cache)                                      |
| `pluginPath`                     | No       | The location of the plugin. Defaults to `node_modules/@defra/forms-engine-plugin`                                                                                                    |
| `preparePageEventRequestOptions` | No       | A function invoked for HTTP-based [page events](./features/configuration-based/page-events) to customise outbound request options                                                    |
| `saveAndExit`                    | No       | Configuration for custom session management. See [save and exit](./features/code-based/save-and-exit)                                                                                |
| `onRequest`                      | No       | A function invoked on each request to any form route (e.g. `/{slug}/{path}`). See [onRequest](#onrequest)                                                                            |
| `ordnanceSurveyApiKey`           | No       | Ordnance Survey API key. Required to enable the inline map on geospatial components. See [geospatial map](#geospatial-map)                                                           |
| `ordnanceSurveyApiSecret`        | No       | Ordnance Survey API secret. Required alongside `ordnanceSurveyApiKey` to enable the inline map on geospatial components                                                              |

## Option details

### Services

See [our services documentation](./features/code-based/custom-services).

### Custom controllers

The `controllers` option lets you register custom page controller classes that extend the built-in `PageController`. A custom controller is tied to a page in your form definition by setting the page's `controller` property to the key you register it under.

```ts
import { PageController } from '@defra/forms-engine-plugin/controllers/PageController.js'
import { type FormModel } from '@defra/forms-engine-plugin/types'
import { type Page } from '@defra/forms-model'

class ConfirmationPageController extends PageController {
  constructor(model: FormModel, pageDef: Page) {
    super(model, pageDef)
  }

  makeGetRouteHandler() {
    return async (request, h) => {
      // custom logic before rendering
      return h.view(this.viewName, { ...await this.getViewModel(request) })
    }
  }
}

await server.register({
  plugin,
  options: {
    controllers: {
      ConfirmationPageController
    }
  }
})
```

In your form definition, set the `controller` property of any page to the same key:

```json
{
  "path": "/confirmation",
  "title": "Confirmation",
  "controller": "ConfirmationPageController",
  "components": []
}
```

When the engine instantiates pages, it first checks for a matching built-in controller, then falls back to the `controllers` map. If no match is found the default `PageController` is used.

### nunjucks configuration

The `nunjucks` option is required and configures the template engine paths and layout.

```ts
{
  baseLayoutPath: string  // Path to the base layout template
  paths: string[]         // Array of paths to search for Nunjucks templates
}
```

Example:

```js
await server.register({
  plugin,
  options: {
    nunjucks: {
      baseLayoutPath: 'layout.html',
      paths: [
        'src/server/views',
        'node_modules/govuk-frontend/dist'
      ]
    }
  }
})
```

The `baseLayoutPath` is the file that all form pages will extend. The `paths` array tells Nunjucks where to look for templates, including your custom templates and any third-party template libraries (like GOV.UK Frontend).

### viewContext

The `viewContext` option is a required function that provides global context variables to all templates rendered by the plugin.

```ts
type ViewContext = (
  request: AnyFormRequest | null
) => Record<string, unknown> | Promise<Record<string, unknown>>
```

This function receives the current request (or `null` for non-request contexts) and should return an object containing any data you want available in your templates, such as:

- Application version
- Asset paths
- Configuration values
- CSRF tokens
- User session data
- Feature flags

Example:

```js
import pkg from './package.json' with { type: 'json' }

await server.register({
  plugin,
  options: {
    viewContext: (request) => {
      return {
        appVersion: pkg.version,
        assetPath: '/assets',
        config: {
          serviceName: 'My Service',
          phaseTag: 'beta'
        },
        // Add CSRF token if request exists
        crumb: request?.plugins.crumb?.generate?.(request)
      }
    }
  }
})
```

The context returned by this function is merged with the plugin's internal context and made available to all templates.

### model

The `model` option allows you to provide a pre-built `FormModel` instance to serve a single static form definition.

When `model` is provided:

- The plugin serves only that specific form
- No dynamic form loading occurs
- Useful for testing or single-form applications

When `model` is omitted (recommended for production):

- Forms are loaded dynamically via `formsService`
- Multiple forms can be served
- Form definitions can be updated without redeploying

Example (single form):

```js
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'

const definition = await getFormDefinition()

const model = new FormModel(
  definition,
  { basePath: '/my-form' },
  services
)

await server.register({
  plugin,
  options: {
    model,
    // ... other options
  }
})
```

### Custom globals

Use the `globals` plugin option to provide custom functions that can be called from within Nunjucks templates.

Unlike filters which transform values, globals are functions that can be called directly in templates.

Example:

```js
await server.register({
  plugin,
  options: {
    globals: {
      getCurrentYear: () => new Date().getFullYear(),
      formatCurrency: (amount) => new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(amount)
    }
  }
})
```

In your templates:

```html
<p>Copyright {{ getCurrentYear() }}</p>
<p>Total: {{ formatCurrency(123.45) }}</p>
```

### Custom filters

Use the `filter` plugin option to provide custom template filters.
Filters are available in both [nunjucks](https://mozilla.github.io/nunjucks/templating.html#filters) and [liquid](https://liquidjs.com/filters/overview.html) templates.

```
const formatter = new Intl.NumberFormat('en-GB')

await server.register({
  plugin,
  options: {
    filters: {
      money: value => formatter.format(value),
      upper: value => typeof value === 'string' ? value.toUpperCase() : value
    }
  }
})
```

### Custom cache

The plugin will use the [default server cache](https://hapi.dev/api/?v=21.4.0#-serveroptionscache) to store form answers on the server.
This is just an in-memory cache which is fine for development.

In production you should create a custom cache one of the available `@hapi/catbox` adapters.

E.g. [Redis](https://github.com/hapijs/catbox-redis)

```
import { Engine as CatboxRedis } from '@hapi/catbox-redis'

const server = new Hapi.Server({
  cache : [
    {
      name: 'my_cache',
      provider: {
        constructor: CatboxRedis,
        options: {}
      }
    }
  ]
})
```

### onRequest

If provided, the `onRequest` plugin option will be invoked on each request to any routes registered by the plugin.

```ts
export type OnRequestCallback = (
  request: AnyFormRequest,
  h: FormResponseToolkit,
  context: FormContext
) => ResponseObject | FormResponseToolkit['continue'] | Promise<ResponseObject | FormResponseToolkit['continue']>
```

Here's an example of how it could be used to secure access to forms:

```js
await server.register({
  plugin,
  options: {
    onRequest: async (request, h, context) => {
      const { auth } = request

      // Check if user is authenticated
      if (!auth.isAuthenticated) {
        return h.redirect('/login').takeover()
      }

      // Return h.continue to resume with normal form processing
      return h.continue
    }
  }
})
```

### saveAndExit

The `saveAndExit` plugin option enables custom session handling to enable "Save and Exit" functionality. It is an optional route handler function that is called with the hapi request and response toolkit in addition to the last argument which is the [form context](./request-lifecycle) of the current page from which the save and exit button was pressed:

```ts
export type SaveAndExitHandler = (
  request: FormRequestPayload,
  h: FormResponseToolkit,
  context: FormContext
) => ResponseObject
```

```js
await server.register({
  plugin,
  options: {
    saveAndExit: (
      request: FormRequestPayload,
      h: FormResponseToolkit,
      context: FormContext
    ) => {
      const { params } = request
      const { slug } = params

      // Redirect user to custom page to handle saving
      return h.redirect(`/custom-magic-link-save-and-exit/${slug}`)
    }
  }
})
```

For detailed documentation and examples, see [Save and Exit](./features/code-based/save-and-exit).

### Geospatial map

Geospatial components ([Easting Northing](./features/components/easting-northing-field.md), [OS Grid Ref](./features/components/os-grid-ref-field.md), [National Grid Field Number](./features/components/national-grid-field-number-field.md), [Lat Long](./features/components/lat-long-field.md), [Geospatial](./features/components/geospatial-field.md)) render an inline Ordnance Survey map alongside their input fields. The map lets users click a location to auto-populate the coordinate inputs, rather than typing values manually.

The map is only activated when both `ordnanceSurveyApiKey` and `ordnanceSurveyApiSecret` are provided at plugin registration. Without them the components still function as plain text inputs.

```js
await server.register({
  plugin,
  options: {
    ordnanceSurveyApiKey: process.env.ORDNANCE_SURVEY_API_KEY,
    ordnanceSurveyApiSecret: process.env.ORDNANCE_SURVEY_API_SECRET,
    // ... other options
  }
})
```
