# Getting started with DXT

1. [Foundational knowledge](#foundational-knowledge)
2. [Add forms-engine-plugin as a dependency](#step-1-add-forms-engine-plugin-as-a-dependency)
3. [Register DXT as a hapi plugin](#step-2-register-dxt-as-a-hapi-plugin)
4. [Handling static assets](#step-3-handling-static-assets)
5. [Environment variables](#step-4-environment-variables)
6. [Creating and loading a form](#step-5-creating-and-loading-a-form)

## Foundational knowledge

DXT's forms engine is a plugin for a frontend service, which allows development teams to construct forms using configuration and minimal code. Forms are closely based on the knowledge, components and patterns from the GDS Design System. Forms should remain as lightweight as possible, with business logic being implemented in a backend/BFF API and DXT used as a simple presentation layer.

You should aim, wherever possible, to utilise the existing behaviours of DXT. Our team puts a lot of effort into development, user testing and accessibility testing to ensure the forms created with DXT will be of a consistently high quality. Where your team introduces custom behaviour, such as custom components or custom pages, this work will now need to be done by your team. Where possible, favour fixing something upstream in the plugin so many teams can benefit from the work we do. Then, if you still need custom behaviour - go for it! DXT is designed to be extended, just be wise with how you spend your efforts.

When developing with DXT, you should favour development using the below priority order. This will ensure your team is writing the minimum amount of code, focusing your efforts on custom code where the requirements are niche and there is value.

1. Use out-of-the box DXT components and page types (components, controllers)
2. Use configuration-driven advanced functionality to integrate with backends and dynamically change page content (page events, page templates)
3. Use custom views, custom components and page controllers to implement highly tailored and niche logic (custom Nunjucks, custom Javascript)

### Contributing back to DXT

When you build custom components and page controllers, they might be useful for other teams in Defra to utilise. For example, many teams collect CPH numbers but have no way to validate it's correct. Rather than creating a new CPH number component and letting it sit in your codebase for just your team, see our [contribution guide](./CONTRIBUTING.md) to learn how to contribute this back to DXT for everyone to benefit from.

## Step 1: Add forms-engine-plugin as a dependency

### Installation

`npm install @defra/forms-engine-plugin --save`

### Dependencies

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

## Step 2: Register DXT as a hapi plugin

```javascript
import plugin from '@defra/forms-engine-plugin'
await server.register({
  plugin,
  options: {
    // if applicable
  }
})
```

Full example:

```javascript
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

const paths = [join(config.get('appDir'), 'views')]

// Register the `forms-engine-plugin`
await server.register({
  plugin,
  options: {
    cacheName: 'session', // must match a session you've instantiated in your hapi server config
    /**
     * Options that DXT uses to render Nunjucks templates
     */
    nunjucks: {
      baseLayoutPath: 'your-base-layout.html', // the base page layout. Usually based off https://design-system.service.gov.uk/styles/page-template/
      paths // list of directories DXT should use to render your views. Must contain baseLayoutPath.
    },
    /**
     * Services is what DXT uses to interact with external APIs
     */
    services: {
      formsService, // where your forms should be downloaded from.
      formSubmissionService, // handles temporary storage of file uploads
      outputService // where your form should be submitted to
    },
    /**
     * View context attributes made available to your pages. Returns an object containing an arbitrary set of key-value pairs.
     */
    viewContext: async (request) => { // async can be dropped if there's no async code within
      const user = await userService.getUser(request.auth.credentials)

      return {
        "greeting": "Hello" // available to render on a nunjucks page as {{ greeting }}
        "username": user.username // available to render on a nunjucks page as {{ username }}
      }
    }
  }
})

await server.start()
```

## Step 3: Handling static assets

TODO: CSS will be updated with a proper build process using SASS.

1. [Update webpack to bundle the DXT application assets (CSS, JavaScript, etc)](https://github.com/DEFRA/forms-engine-plugin-example-ui/pull/1/files#diff-1fb26bc12ac780c7ad7325730ed09fc4c2c3d757c276c3dacc44bfe20faf166f)
2. [Serve the newly bundled assets from your web server](https://github.com/DEFRA/forms-engine-plugin-example-ui/pull/1/files#diff-e5b183306056f90c7f606b526dbc0d0b7e17bccd703945703a0811b6e6bb3503)

DXT plans to prefix to these asset paths to prevent collisions with your assets. Contact [#defra-forms-support](https://defra-digital-team.slack.com) if this is a blocker for you.

## Step 4: Environment variables

Blocks marked with `# FEATURE: <name>` are optional and can be omitted if the feature is not used.

```shell
# START FEATURE: Phase banner -- supports `https://` and `mailto:` links in the feedback link
FEEDBACK_LINK=http://test.com
# END FEATURE: Phase banner

# START FEATURE: DXT -- used if using DXT's infrastructure for file uploads
DESIGNER_URL=http://localhost:3000
SUBMISSION_URL=http://localhost:3002

# S3 bucket and URL of the CDP uploader. Bucket is owned by DXT, uploader is your service's URL.
UPLOADER_BUCKET_NAME=my-bucket
UPLOADER_URL=http://localhost:7337
# END FEATURE: DXT

# START FEATURE: GOV.UK Notify -- used if using DXT's default GOV.UK Notify email sender
NOTIFY_TEMPLATE_ID="your-gov-notify-api-key"
NOTIFY_API_KEY="your-gov-notify-api-key"
# END FEATURE: GOV.UK Notify

# START FEATURE: Google Analytics -- if enabled, shows a cookie banner and includes GA on the cookies/privacy policy
GOOGLE_ANALYTICS_TRACKING_ID='12345'
# END FEATURE: Google Analytics
```

## Step 5: Creating and loading a form

Forms in DXT are represented by a JSON configuration file. The configuration defines several top-level elements:

The `form-engine-plugin` uses JSON configuration files to serve form journeys.
These files are called `Form definitions` and are built up of:

- `pages` - includes a `path`, `title`
- `components` - one or more questions on a page
- `conditions` - used to conditionally show and hide pages and
- `lists` - data used to in selection fields like [Select](https://design-system.service.gov.uk/components/select/), [Checkboxes](https://design-system.service.gov.uk/components/checkboxes/) and [Radios](https://design-system.service.gov.uk/components/radios/)

To understand the full set of options available to you, consult our [schema documentation](https://defra.github.io/forms-engine-plugin/schemas/). Specifically, the [form definition schema](https://defra.github.io/forms-engine-plugin/schemas/form-definition-v2-payload-schema).

### Config

#### Pages

Pages are the main entity in the config. They are stored in a JSON Array with each representing a single web page.
Users are progressed through the pages in turn, starting from the first page. This is called the form journey.
Pages can be skipped by assigning a condition to the page, when the condition evaluates to false, the page is skipped.

```jsonc
{
  // Each page is identified by an UUID
  "id": "449c053b-9201-4312-9a75-187ac1b720eb",

  // A page title and a path are required
  "title": "What is your full name",
  "path": "/what-is-your-full-name",

  // A reference to a condition
  "condition": "Condition UUID",

  // A page contains a colection of components
  "components": [
    // ...
  ]
}
```

#### Components

Components are categorised into two:

- Form components - the questions on a page
- Guidance components - non-form components like markdown and details

```jsonc
{
  // Each page is identified by an UUID
  "id": "2e088e75-c6f6-4a0f-8f1f-3cee14c71e4c",

  // A component type, title, name and shortDescription are all required
  "type": "TextField",
  "title": "Nickname",
  "name": "SyHQCH",
  "shortDescription": "Nickname",

  // A component hint text is optional
  "hint": "Question hint text here",

  // Different options are available per component
  // All components support the `required (boolean) option.
  "options": {
    "required": true
  },
  // Different schema settings are available per component
  // E.g. TextFields have minLength and maxLength.
  "schema": {
    // ...
  }
}
```

#### Lists

Lists are used to populated selection components like Radios and Selects

```jsonc
{
  // Each list is identified by an UUID
  "id": "23d5309e-1aed-427d-b8ee-87e14f673e7f",

  // A list name, title, type and items are all required
  "name": "colours", // Unused (deprecated)
  "title": "Colours",
  "type": "string", // Can also be "number"
  "items": [
    {
      // Each list item is identified by an UUID
      "id": "bedd5984-fa95-48f9-87e2-1089d66574b2",

      // List item text and value are both required.
      // If the list type is "number", the value should be numeric
      "text": "Red",
      "value": "red"
    },
    {
      "id": "45c4bd8d-936f-4dda-b6a8-64c9d2532f10",
      "text": "Blue",
      "value": "blue"
    },
    // ...
  ]
}
```

#### Conditions

Conditions bring logic to the form, when assigned to a page they make the page "conditional" and the page is only visited if the condition evaluates to "truthy"

```jsonc
{
  // Each condition is identified by an UUID
  "id": "0e7ae320-c876-40c2-8803-7848cc49689b",

  // Condition displayName should be unique
  "displayName": "faveColourIsRed",

  "items": [
    {
      // Each condition item is identified by an UUID
      "id": "f03a6735-0f7c-4dc9-b65c-7c42fcd0d189",

      // `componentId` is a reference to the component
      "componentId": "fa67e20d-a89b-4e8a-85ec-8a63923b7137",

      // Condition `operator` is a comparison operator ('is', 'is not', 'is longer than', 'contains', 'has length' etc.)
      "operator": "is",

      // Conditions item values come in a few different forms:

      // 1. `ListItemRef` - use these when the condition references a question (componentId) that is a list selection
      // The `value` of a `ListitemRef` should be an object with a listId and itemId keys pointing to the list and list item
      "type": "ListItemRef",
      "value": {
        "listId": "23d5309e-1aed-427d-b8ee-87e14f673e7f", // References the "Colours" list
        "itemId": "bedd5984-fa95-48f9-87e2-1089d66574b2"  // References the "Red" item in the "Colours" list
      },

      // 2. `RelativeDate` - relative date for date-based conditions
      // The `value` of a `RelativeDate` should be an object with a listId and itemId keys pointing to the list and list item
      "type": "ListItemRef",
      "value": {
        "period": 1, // Numeric amount of the time period
        "unit": "weeks", // Time unit (days, weeks, months, years),
        "direction": "future" // Temporal direction (either "past" or "future"')
      },

      // 3. Scalar values can be `StringValue`, `NumberValue`, `BooleanValue` or `DateValue`
      // and are used to check absolute values of strings (TextField), numbers (NumberField), booleans (YesNoField) or dates (DatePartsField)
      // They are also used when the `operator` implies a numeric parameter e.g. 'has length' see below for examples.
      // The `value` of a scalar value condition should be a literal of the same type e.g.
      "type": "StringValue",
      "value": "Enrique Chase"
    }
  ],

  // When the condition has 2 or more items, a coordinator is also required
  "coordinator": "and", // Supports both "and" and "or"
}
```

#### Condition examples

```jsonc
{
  "name": "Example form asking what a users favourite animal are, with an condition based on their answer",
  "pages": [
    {
      "id": "a86ea4ba-ae3b-4324-9acd-3a3f347cb0ec",
      "title": "What are your favourite animals",
      "path": "/favourite-animal",
      "components": [
        {
          // ComponentId
          "id": "f0f67bf7-cdbb-4247-9f3c-8cd919183968",
          "type": "CheckboxesField",
          "title": "What are your favourite animals",
          "name": "nUaCCW",
          "shortDescription": "Favourite animals",
          "hint": "",
          "options": {
            "required": true
          },
          "schema": {},

          // References the "Animals" list
          "list": "0e047f83-dbb6-4c82-b709-f9dbaddf8644"
        }
      ],
      "next": []
    }
  ],
  "conditions": [
    {
      "items": [
        {
          // This condition checks if the user chose "Monkey" as one of their favourite animals
          "id": "86e63584-12a8-4f2b-b51b-49765518b811",
          "componentId": "f0f67bf7-cdbb-4247-9f3c-8cd919183968",
          "operator": "contains",
          "type": "ListItemRef",
          "value": {
            // Reference to the "Animals" list
            "listId": "0e047f83-dbb6-4c82-b709-f9dbaddf8644",
            // Reference to "Monkey" in the "Animals" list
            "itemId": "0c546ae1-897e-48d0-9388-b0902fe23baf"
          }
        }
      ],
      "displayName": "FaveAnimalIsMonkey",
      "id": "8a3f6bb2-c305-410a-a037-7375be839105"
    }
  ],
  "sections": [],
  "lists": [
    {
      "id": "0e047f83-dbb6-4c82-b709-f9dbaddf8644",
      "name": "sdewRT",
      "title": "Animals",
      "type": "string",
      "items": [
        {
          "id": "fb3519b2-c6c7-40b6-8e03-2fb0db6d4f32",
          "text": "Horse",
          "value": "horse"
        },
        {
          "id": "0c546ae1-897e-48d0-9388-b0902fe23baf",
          "text": "Monkey",
          "value": "monkey"
        },
        {
          "id": "39f6fa65-1781-4569-9ba3-d8d13931f036",
          "text": "Giraffe",
          "value": "giraffe"
        }
      ]
    }
  ],
  "engine": "V2",
  "schema": 2
}
```
