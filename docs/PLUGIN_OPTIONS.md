---
layout: default
title: Plugin options
render_with_liquid: false
nav_order: 3
---

# Plugin options

The forms plugin is configured with [registration options](https://hapi.dev/api/?v=21.4.0#plugins)

- `services` (optional) - object containing `formsService`, `formSubmissionService` and `outputService`
  - `formsService` - used to load `formMetadata` and `formDefinition`
  - `formSubmissionService` - used prepare the form during submission (ignore - subject to change)
  - `outputService` - used to save the submission
- `controllers` (optional) - Object map of custom page controllers used to override the default. See [custom controllers](#custom-controllers)
- `globals` (optional) - A map of custom template globals to include
- `filters` (optional) - A map of custom template filters to include
- `cacheName` (optional) - The cache name to use. Defaults to hapi's [default server cache]. Recommended for production. See [here](#custom-cache) for more details
- `pluginPath` (optional) - The location of the plugin (defaults to `node_modules/@defra/forms-engine-plugin`)
- `preparePageEventRequestOptions` (optional) - A function that will be invoked for http-based [page events](./features/configuration-based/PAGE_EVENTS.md). See [here](./features/configuration-based/PAGE_EVENTS.md#authenticating-a-http-page-event-request-from-dxt-in-your-api) for details
- `saveAndReturn` (optional) - Configuration for custom session management including key generation, session hydration, and persistence. See [save and return documentation](./features/code-based/SAVE_AND_RETURN.md) for details
- `onRequest` (optional) - A function that will be invoked on each request to any form route e.g `/{slug}/{path}`. See [here](#onrequest) for more details

## Services

See [our services documentation](./features/code-based/CUSTOM_SERVICES.md).

## Custom controllers

TODO

## Custom filters

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

## Custom cache

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

## onRequest

If provided, the `onRequest` plugin option will be invoked on each request to any routes registered by the plugin.

```ts
export type OnRequestCallback = (
  request: FormRequest | FormRequestPayload,
  params: FormParams,
  definition: FormDefinition,
  metadata: FormMetadata
) => void
```

Here's an example of how it could be used to secure access to forms:

```js
await server.register({
  plugin,
  options: {
    onRequest: (request , params, definition, metadata) => {
        const { auth } = request

        if (!auth.isAuthenticated) {
          throw Boom.unauthorized()
        }
      }
  }
})
```

## saveAndReturn

The `saveAndReturn` plugin option enables custom session handling to enable "Save and Return" functionality. It consists of three optional functions:

- `keyGenerator` - Generates unique cache keys for session storage
- `sessionHydrator` - Retrieves saved session data from external sources
- `sessionPersister` - Stores session data to external systems

```js
await server.register({
  plugin,
  options: {
    saveAndReturn: {
      keyGenerator: (request) => {
        const { userId, applicationId } = fetchSubmissionAttributes(request)
        return `${userId}:${applicationId}`
      },

      sessionHydrator: async (request) => {
        // Fetch saved state from database/API
        const savedState = await fetchUserSession(request)
        return savedState || null
      },

      sessionPersister: async (key, state, request) => {
        // Save state to database/API
        await saveUserSession(key, state, request)
      }
    }
  }
})
```

For detailed documentation and examples, see [Save and Return](./features/code-based/SAVE_AND_RETURN.md).
