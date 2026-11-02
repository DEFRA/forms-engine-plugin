# Session cache

The plugin stores form answers in a server-side cache keyed by the user's session. By default it uses the [hapi in-memory cache](https://hapi.dev/api/?v=21.4.0#-serveroptionscache), which is fine for development but unsuitable for production — sessions are lost on restart and are not shared across instances.

Configure the cache via the `cache` plugin option.

## Option 1 — named cache (recommended)

For most deployments, register a named [catbox](https://hapi.dev/module/catbox/) cache on the hapi server and pass its name as the `cache` plugin option. The plugin handles all cache reads and writes internally — you only need to supply the backing store.

```js
import { Engine as CatboxRedis } from '@hapi/catbox-redis'

const server = new Hapi.Server({
  cache: [
    {
      name: 'session',
      provider: {
        constructor: CatboxRedis,
        options: {
          host: process.env.REDIS_HOST,
          port: 6379
        }
      }
    }
  ]
})

await server.register({
  plugin,
  options: {
    cache: 'session',
    // ...
  }
})
```

Any catbox adapter works — Redis (`@hapi/catbox-redis`), Memcached (`@hapi/catbox-memcached`), or a custom implementation.

## Option 2 — CacheService instance

Use this when you need to subclass `CacheService` to customise its behaviour. The class exposes the full state lifecycle as overridable methods — key construction, TTL, state reads and writes, confirmation state, flash messages, and component state resets — so you can override whichever parts your use case requires. Pass your subclass instance directly:

```js
import { CacheService } from '@defra/forms-engine-plugin/cache-service.js'

const cacheService = new CacheService({ server, cacheName: 'session' })

await server.register({
  plugin,
  options: {
    cache: cacheService,
    // ...
  }
})
```

`CacheService` accepts `{ server, cacheName }` where `cacheName` must match a cache already registered on the hapi server. Omitting `cacheName` falls back to the default in-memory cache with a warning logged.
