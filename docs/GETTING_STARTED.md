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
