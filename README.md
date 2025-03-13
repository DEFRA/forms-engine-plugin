# @defra/forms-engine-plugin

The `@defra/forms-engine-plugin` is a [plugin](https://hapi.dev/tutorials/plugins/?lang=en_US) for [hapi](https://hapi.dev/) used to serve GOV.UK-based form journeys.

It is designed to be embedded in the frontend of a digital service and provide a convenient, configuration driven approach to building forms that are aligned to [GDS Design System](https://design-system.service.gov.uk/) guidelines.

## Installation

`npm install @defra/forms-engine-plugin --save`

## Dependencies

The following are [plugin dependencies](https://hapi.dev/api/?v=21.4.0#server.dependency()) that are required to be registered with hapi:

`npm install hapi-pino @hapi/crumb @hapi/yar @hapi/vision --save`

- [hapi-pino](https://github.com/hapijs/hapi-pino) - [Pino](https://github.com/pinojs/pino) logger for hapi
- [@hapi/crumb](https://github.com/hapijs/crumb) - CSRF crumb generation and validation
- [@hapi/yar](https://github.com/hapijs/yar) - Session manager
- [@hapi/vision](https://github.com/hapijs/vision) - Template rendering support


Additional npm dependencies that you will need are:

`npm install nunjucks govuk-frontend --save`

- [nunjucks](https://www.npmjs.com/package/nunjucks) - [templating engine](https://mozilla.github.io/nunjucks/) used by GOV.UK design system
- [govuk-frontend](https://www.npmjs.com/package/govuk-frontend) - [code](https://github.com/alphagov/govuk-frontend) you need to build a user interface for government platforms and services

Optional dependencies

`npm install @hapi/inert --save`

- [@hapi/inert](https://www.npmjs.com/package/@hapi/inert) - static file and directory handlers for serving GOV.UK assets and styles

## Setup

### Templates and views

Vision and nunjucks both need to be configured to search in the forms plugin module directory when looking for views.

The path is `node_modules/@defra/forms-engine/src/server/plugins/engine/views`.

For vision this is done through the `path` [plugin option](https://github.com/hapijs/vision/blob/master/API.md#options)
For nunjucks it is configured through the environment [confgure options](https://mozilla.github.io/nunjucks/api.html#configure).

The main template layout you use will likely be the govuk-frontend `template.njk` file, so this also needs to be added to the `path`s that nunjucks can look in.

### Static assets and styles

## Example

```
import hapi from '@hapi/hapi'
import yar from '@hapi/yar'
import vision from '@hapi/vision'
import crumb from '@hapi/crumb'
import inert from '@hapi/inert'
import pino from 'hapi-pino'
import nunjucks from 'nunjucks'
import plugin, { filters, context, globals } from '@defra/forms-engine-plugin'

const server = hapi.server({
  port: 3000
})

// Register the dependent plugins
await server.register(pino)
await server.register(crumb)
await server.register({
  plugin: yar,
  options: {
    cookieOptions: {
      password: 'ENTER_YOUR_SESSION_COOKIE_PASSWORD_HERE' // Must be > 32 chars
    }
  }
})

const path = [
  'node_modules/@defra/forms-engine-plugin/src/server/plugins/engine/views',
  'server/views'
]

await server.register({
  plugin: vision,
  options: {
    engines: {
      html: {
        compile: (src, options) => {
          const template = nunjucks.compile(src, options.environment)

          return (context) => {
            return template.render(context)
          }
        },
        prepare: (options, next) => {
          const env = nunjucks.configure(
            [
              ...path,
              'node_modules/govuk-frontend/dist'
            ],
            {
              trimBlocks: true,
              lstripBlocks: true
            }
          )

          for (const [name, nunjucksFilter] of Object.entries(filters)) {
            env.addFilter(name, nunjucksFilter)
          }

          for (const [name, nunjucksGlobal] of Object.entries(globals)) {
            env.addGlobal(name, nunjucksGlobal)
          }

          options.compileOptions.environment = env

          return next()
        }
      }
    },
    path,
    context
  }
})

await server.register(inert)

await server.register({
  plugin
})

await server.start()
```

## Environment variables

## Options

The forms plugin is configured with [registration options](https://hapi.dev/api/?v=21.4.0#plugins)

- `model` (optional) -
- `services` (optional) -
- `controllers` (optional) -
- `cacheName` (optional) -

### Services



### Custom controllers
TODO

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

## Exemplar
TODO: Link to exemplar

## Templates

The following elements support [LiquidJS templates](https://liquidjs.com/):

- Page **title**
- Form component **titles**
  - Support for fieldset legend text or label text
  - This includes when the title is used in **error messages**
- Html (guidance) component **content**
- Summary component **row** key title (check answers and repeater summary)

### Template data

The data the templates are evaluated against is the raw answers the user has provided up to the page they're currently on.
For example, given a YesNoField component called `TKsWbP`, the template `{{ TKsWbP }}` would render "true" or "false" depending on how the user answered the question.

The current FormContext is also available as `context` in the templates. This allows access to the full data including the path the user has taken in their journey and any miscellaneous data returned from `Page event`s in `context.data`.

### Liquid Filters

There are a number of `LiquidJS` filters available to you from within the templates:

- `page` - returns the page definition for the given path
- `field` - returns the component definition for the given name
- `href` - returns the page href for the given page path
- `answer` - returns the user's answer for a given component
- `evaluate` - evaluates and returns a Liquid template using the current context

### Examples

```json
"pages": [
  {
    "title": "What's your name?",
    "path": "/full-name",
    "components": [
      {
        "name": "WmHfSb",
        "title": "What's your full name?",
        "type": "TextField"
      }
    ]
  },
  // This example shows how a component can use an answer to a previous question (What's your full name) in it's title
  {
    "title": "Are you in England?",
    "path": "/are-you-in-england",
    "components": [
      {
        "name": "TKsWbP",
        "title": "Are you in England, {{ WmHfSb }}?",
        "type": "YesNoField"
      }
    ]
  },
  // This example shows how a Html (guidance) component can use the available filters to get the form definition and user answers and display them
  {
    "title": "Template example for {{ WmHfSb }}?",
    "path": "/example",
    "components": [
      {
        "title": "Html",
        "type": "Html",
        "content": "<p class=\"govuk-body\">
          // Use Liquid's `assign` to create a variable that holds reference to the \"/are-you-in-england\" page
          {%- assign inEngland = \"/are-you-in-england\" | page -%}

          // Use the reference to `evaluate` the title
          {{ inEngland.title | evaluate }}<br>

          // Use the href filter to display the full page path
          {{ \"/are-you-in-england\" | href }}<br>

          // Use the `answer` filter to render the user provided answer to a question
          {{ 'TKsWbP' | answer }}
        </p>\n"
      }
    ]
  }
]
```
