# Overriding DXT logic with custom services

## Customising where forms are loaded from

The engine plugin registers several [routes](https://hapi.dev/tutorials/routing/?lang=en_US) on the hapi server.

They look like this:

```
GET     /{slug}/{path}
POST    /{slug}/{path}
```

A unique `slug` is used to route the user to the correct form, and the `path` used to identify the correct page within the form to show.

The [plugin registration options](../../PLUGIN_OPTIONS.md) have a `services` setting to provide a `formsService` that is responsible for returning `form definition` data.

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
