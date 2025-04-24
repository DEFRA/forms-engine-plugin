---
layout: default
title: Custom Services
parent: Code-based Features
grand_parent: Features
render_with_liquid: false
---

# Overriding DXT logic with custom services

## Customising where forms are loaded from

The engine plugin registers several [routes](https://hapi.dev/tutorials/routing/?lang=en_US) on the hapi server.

They look like this:

```
GET     /{slug}/{path}
POST    /{slug}/{path}
```

A unique `slug` is used to route the user to the correct form, and the `path` used to identify the correct page within the form to show.

The [plugin registration options](/forms-engine-plugin/PLUGIN_OPTIONS.md) have a `services` setting to provide a `formsService` that is responsible for returning `form definition` data.

WARNING: This below is subject to change

A `formsService` has two methods, one for returning `formMetadata` and another to return `formDefinition`s.

```javascript
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

## Loading forms from files

To create a `formsService` from form config files that live on disk, you can use the `FileFormService` class.
Form definition config files can be either `.json` or `.yaml`.

Once created and files have been loaded using the `addForm` method,
call the `toFormsService` method to return a `FormService` compliant interface which can be passed in to the `services` setting of the [plugin options](/forms-engine-plugin/PLUGIN_OPTIONS.md).

```javascript
import { FileFormService } from '@defra/forms-engine-plugin/file-form-service.js'

// Create shared form metadata
const now = new Date()
const user = { id: 'user', displayName: 'Username' }
const author = { createdAt: now, createdBy: user, updatedAt: now, updatedBy: user }
const metadata = {
  organisation: 'Defra',
  teamName: 'Team name',
  teamEmail: 'team@defra.gov.uk',
  submissionGuidance: "Thanks for your submission, we'll be in touch",
  notificationEmail: 'email@domain.com',
  ...author,
  live: author
}

// Instantiate the file loader form service
const loader = new FileFormService()

// Add a Json form
await loader.addForm(
  'src/definitions/example-form.json', {
    ...metadata,
    id: '95e92559-968d-44ae-8666-2b1ad3dffd31',
    title: 'Example Json',
    slug: 'example-json'
  }
)

// Add a Yaml form
await loader.addForm(
  'src/definitions/example-form.yaml', {
    ...metadata,
    id: '641aeafd-13dd-40fa-9186-001703800efb',
    title: 'Example Yaml',
    slug: 'example-yaml'
  }
)

// Get the forms service
const formsService = loader.toFormsService()
```
