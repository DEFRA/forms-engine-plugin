# @defra/forms-engine-plugin

The `@defra/forms-engine-plugin` is a [plugin](https://hapi.dev/tutorials/plugins/?lang=en_US) for [hapi](https://hapi.dev/) used to serve GOV.UK-based form journeys.

It is designed to be embedded in the frontend of a digital service and provide a convenient, configuration driven approach to building forms that are aligned to [GDS Design System](https://design-system.service.gov.uk/) guidelines.

## Installation

`npm install @defra/forms-engine-plugin --save`

## Dependencies

The following are [plugin dependencies](<https://hapi.dev/api/?v=21.4.0#server.dependency()>) that are required to be registered with hapi:

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

Vision and nunjucks both need to be configured to search in the `forms-engine-plugin` views directory when looking for template files.

For vision this is done through the `path` [plugin option](https://github.com/hapijs/vision/blob/master/API.md#options)
For nunjucks it is configured through the environment [configure options](https://mozilla.github.io/nunjucks/api.html#configure).

The `forms-engine-plugin` path to add can be imported from:

`import { VIEW_PATH } from '@defra/forms-engine-plugin'`

Which can then be appended to the `node_modules` path `node_modules/@defra/forms-engine`.

The main template layout is `govuk-frontend`'s `template.njk` file, this also needs to be added to the `path`s that nunjucks can look in.

See example below for more detail.

### Form config

The `form-engine-plugin` uses JSON configuration files to serve form journeys.
These files are called `Form definitions` and are built up of:

- `pages` - includes a `path`, `title`
- `components` - one or more questions on a page
- `conditions` - used to conditionally show and hide pages and
- `lists` - data used to in selection fields like [Select](https://design-system.service.gov.uk/components/select/), [Checkboxes](https://design-system.service.gov.uk/components/checkboxes/) and [Radios](https://design-system.service.gov.uk/components/radios/)

The [types](https://github.com/DEFRA/forms-designer/blob/main/model/src/form/form-definition/types.ts), `joi` [schema](https://github.com/DEFRA/forms-designer/blob/main/model/src/form/form-definition/index.ts) and the [examples](test/form/definitions) folder are a good place to learn about the structure of these files.

TODO - Link to wiki for `Form metadata`
TODO - Link to wiki for `Form definition`

#### Providing form config to the engine

The engine plugin registers several [routes](https://hapi.dev/tutorials/routing/?lang=en_US) on the hapi server.

They look like this:

```
GET     /{slug}/{path}
POST    /{slug}/{path}
```

A unique `slug` is used to route the user to the correct form, and the `path` used to identify the correct page within the form to show.
The [plugin registration options](#options) have a `services` setting to provide a `formsService` that is responsible for returning `form definition` data.


WARNING: This below is subject to change

A `formsService` has two methods, one for returning `formMetadata` and another to return `formDefinition`s.

```
const formsService = {
  getFormMetadata: async function (slug) {
    // Returns the metadata for the slug
  },
  getFormDefinition: async function (id, state) {
    // Returns the form definition for the given id
  }
}
```

The reason for the two separate methods is caching.
`formMetadata` is a lightweight record designed to give top level information about a form.
This method is invoked for every page request.

Only when the `formMetadata` indicates that the definition has changed is a call to `getFormDefinition` is made.
The response from this can be quite big as it contains the entire form definition.

See [example](#example) below for more detail

### Static assets and styles

TODO

## Example

```
import hapi from '@hapi/hapi'
import yar from '@hapi/yar'
import vision from '@hapi/vision'
import crumb from '@hapi/crumb'
import inert from '@hapi/inert'
import pino from 'hapi-pino'
import nunjucks from 'nunjucks'
import plugin, { prepareNunjucksEnvironment, context, VIEW_PATH } from '@defra/forms-engine-plugin'

const server = hapi.server({
  port: 3000
})

// Register the dependent plugins
await server.register(pino)
await server.register(inert)
await server.register(crumb)
await server.register({
  plugin: yar,
  options: {
    cookieOptions: {
      password: 'ENTER_YOUR_SESSION_COOKIE_PASSWORD_HERE' // Must be > 32 chars
    }
  }
})

// Paths array to tell `vision` and `nunjucks` where template files are stored.
// This can include `server/views`, or change it to where your local template are stored.
const path = [
  `node_modules/@defra/forms-engine-plugin/${VIEW_PATH}`,
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
          // Nunjucks also needs an additional path configuration
          // to use the templates and macros from `govuk-frontend`
          const environment = nunjucks.configure(
            [
              ...path,
              'node_modules/govuk-frontend/dist'
            ]
          )

          // Applies custom filters and globals for nunjucks
          // that are required by the `forms-engine-plugin`
          prepareNunjucksEnvironment(environment)

          options.compileOptions.environment = environment

          return next()
        }
      }
    },
    path,
    context
  }
})

// Registers the `forms-engine-plugin`
await server.register({
  plugin
})

await server.start()
```

## Environment variables

## Options

The forms plugin is configured with [registration options](https://hapi.dev/api/?v=21.4.0#plugins)

- `services` (optional) - object containing `formsService`, `formSubmissionService` and `outputService`
  - `formsService` - used to load `formMetadata` and `formDefinition`
  - `formSubmissionService` - used prepare the form during submission (ignore - subject to change)
  - `outputService` - used to save the submission
- `controllers` (optional) - Object map of custom page controllers used to override the default. See [custom controllers](#custom-controllers)
- `cacheName` (optional) - The cache name to use. Defaults to hapi's [default server cache]. Recommended for production. See [here](#custom-cache) for more details

### Services

TODO

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

TODO: Link to CDP exemplar

## Templates

The following elements support [LiquidJS templates](https://liquidjs.com/):

- Page **title**
- Form component **title**
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
