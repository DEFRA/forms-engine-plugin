# Form definition formats

Form definitions are retrieved by `forms-engine-plugin` using the `formsService` plugin registration option. The plugin calls `getFormDefinition()` on every page request, which must return a JavaScript object matching the form definition schema.

Two approaches are available:

- **File-based loading** — store form definitions as YAML or JSON files in your repository and use the built-in `FileFormService`
- **Custom service** — implement your own `formsService` to load definitions from an API, database, or any other source

## File-based loading

The built-in `FileFormService` loads form definitions from disk. YAML is recommended for forms with multi-line HTML content, as it natively supports block scalars. JSON is more portable but requires manually escaping quotes and line breaks in string values.

### Registering forms

```js
import { FileFormService } from '@defra/forms-engine-plugin/file-form-service.js'

const now = new Date()
const user = { id: 'user', displayName: 'Username' }
const author = { createdAt: now, createdBy: user, updatedAt: now, updatedBy: user }

const loader = new FileFormService()

await loader.addForm('src/definitions/example-form.yaml', {
  id: '95e92559-968d-44ae-8666-2b1ad3dffd31',
  title: 'Example form',
  slug: 'example-form',
  organisation: 'Defra',
  teamName: 'Team name',
  teamEmail: 'team@defra.gov.uk',
  submissionGuidance: "Thanks for your submission, we'll be in touch",
  notificationEmail: 'team@defra.gov.uk',
  ...author,
  live: author
})

const formsService = loader.toFormsService()
```

Pass the resulting `formsService` as a plugin registration option:

```js
await server.register({
  plugin,
  options: {
    services: { formsService },
    // ...
  }
})
```

Call `loader.addForm()` once per form definition file. The `slug` controls the URL path — a form with `slug: 'example-form'` is served at `/example-form/*`.

### YAML vs JSON

```yaml
# example-form.yaml — YAML supports multi-line content natively
name: "Form name"
pages:
  - title: "Page title"
    components:
      - type: "Html"
        content: |
          <h1 class="govuk-heading-l">Heading</h1>
          <p class="govuk-body">Body text</p>
```

```jsonc
// example-form.json — JSON requires escaped quotes and no newlines in strings
{
  "name": "Form name",
  "pages": [
    {
      "title": "Page title",
      "components": [
        {
          "type": "Html",
          "content": "<h1 class=\"govuk-heading-l\">Heading</h1><p class=\"govuk-body\">Body text</p>"
        }
      ]
    }
  ]
}
```

## Custom formsService

To load form definitions from an API, database, or CMS, implement a custom `formsService` and pass it at plugin registration. The interface requires four methods:

```ts
interface FormsService {
  getFormMetadata: (slug: string) => Promise<FormMetadata>
  getFormMetadataById: (id: string) => Promise<FormMetadata>
  getFormDefinition: (id: string, state: FormStatus) => Promise<FormDefinition | undefined>
  getFormSecret: (formId: string, secretName: string) => Promise<string>
}
```

`getFormMetadata` is called on every page request and should be fast. `getFormDefinition` is only called when the metadata signals the definition has changed, so it can do heavier lifting.

See [Custom Services](./custom-services) for a full implementation guide.
