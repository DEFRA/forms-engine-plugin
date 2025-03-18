# @defra/forms-engine-plugin

The `@defra/forms-engine-plugin` is a [plugin](https://hapi.dev/tutorials/plugins/?lang=en_US) for [hapi](https://hapi.dev/) used to serve GOV.UK-based form journeys.

It is designed to be embedded in the frontend of a digital service and provide a convenient, configuration driven approach to building forms that are aligned to [GDS Design System](https://design-system.service.gov.uk/) guidelines.

## Table of Contents

- [Installation](#installation)
- [Dependencies](#dependencies)
- [Setup](#setup)
  - [Form Config](#form-config)
  - [Static Assets and Styles](#static-assets-and-styles)
- [Example](#example)
- [Environment Variables](#environment-variables)
- [Options](#options)
  - [Services](#services)
  - [Custom Controllers](#custom-controllers)
  - [Custom Filters](#custom-filters)
  - [Custom Cache](#custom-cache)
- [Exemplar](#exemplar)
- [Templates](#templates)
  - [Template Data](#template-data)
  - [Liquid Filters](#liquid-filters)
  - [Examples](#examples)
- [Templates and Views: Extending the Default Layout](#templates-and-views-extending-the-default-layout)
- [Publishing the Package](#publishing-the-package)
  - [Semantic Versioning Control](#semantic-versioning-control)
  - [Major-Version Release Branches](#major-version-release-branches)
  - [Manual Workflow Triggers](#manual-workflow-triggers)
  - [Workflow Triggers](#workflow-triggers)
  - [Safety and Consistency](#safety-and-consistency)

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
import crumb from '@hapi/crumb'
import inert from '@hapi/inert'
import pino from 'hapi-pino'
import plugin from '@defra/forms-engine-plugin'

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

// Register the `forms-engine-plugin`
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
- `filters` (optional) - A map of custom template filters to include
- `cacheName` (optional) - The cache name to use. Defaults to hapi's [default server cache]. Recommended for production. See [here]
  (#custom-cache) for more details
- `pluginPath` (optional) - The location of the plugin (defaults to `node_modules/@defra/forms-engine-plugin`)

### Services

TODO

### Custom controllers

TODO

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

### Template Data

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

## Templates and views: Extending the default layout

TODO

To override the default page template, vision and nunjucks both need to be configured to search in the `forms-engine-plugin` views directory when looking for template files.

For vision this is done through the `path` [plugin option](https://github.com/hapijs/vision/blob/master/API.md#options)
For nunjucks it is configured through the environment [configure options](https://mozilla.github.io/nunjucks/api.html#configure).

The `forms-engine-plugin` path to add can be imported from:

`import { VIEW_PATH } from '@defra/forms-engine-plugin'`

Which can then be appended to the `node_modules` path `node_modules/@defra/forms-engine`.

The main template layout is `govuk-frontend`'s `template.njk` file, this also needs to be added to the `path`s that nunjucks can look in.

## Publishing the Package

Our GitHub Actions workflow (`publish.yml`) is set up to make publishing a breeze, using semantic versioning and a variety of release strategies. Here's how you can make the most of it:

### Semantic Versioning Control

- **Patch Versioning**: This happens automatically whenever you merge code changes into `main` or any release branch.
- **Minor and Major Bumps**: You can control these by making empty commits with specific hashtags:
  - Use `#minor` for a minor version bump.
  - Use `#major` for a major version bump.

**Example Commands**:

```bash
git commit --allow-empty -m "chore(release): #minor" # Minor bump
git commit --allow-empty -m "chore(release): #major" # Major bump
```

### Major-Version Release Branches

- **Branch Naming**: Stick to `release/vX` (like `release/v1`, `release/v2`).
- **Independent Versioning**: Each branch has its own versioning and publishes to npm with a unique dist-tag (like `2x` for `release/v2`).

### Manual Workflow Triggers

- **Customizable Options**: You can choose the type of version bump, specify custom npm tags, and use dry run mode for testing. Dry-run is enabled by default.
- **Special Releases**: Perfect for beta releases or when you need to publish outside the usual process.

### Workflow Triggers

1. **Standard Development Flow**: Merging PRs to `main` automatically triggers a patch bump and publishes with the `beta` tag.
2. **Backporting**: Cherry-pick fixes to release branches for patch bumps with specific tags (like `2x`).
3. **Version Bumps**: Use empty commits for minor or major bumps.
4. **Manual Releases**: Trigger these manually for special cases like beta or release candidates.

### Safety and Consistency

- **Build Process**: Every publishing scenario includes a full build to ensure everything is in top shape, except for files like tests and lint rules.
- **Tagging Safety**: We prevent overwriting the `beta` tag by enforcing custom tags for non-standard branches. The default is set to `beta`. For release branches, the tag will be picked up from the release branch itself.
