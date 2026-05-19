# Overriding forms-engine-plugin logic with custom services

The `services` plugin option accepts three service objects — `formsService`, `formSubmissionService`, and `outputService` — which together cover where forms come from, where submission data goes, and how submission notifications are sent. Replace any or all of them to integrate with your own infrastructure.

## formsService

Responsible for loading form metadata and definitions. Called on every page request to check for definition changes and load the full definition when needed.

```ts
interface FormsService {
  getFormMetadata: (slug: string) => Promise<FormMetadata>
  getFormMetadataById: (id: string) => Promise<FormMetadata>
  getFormDefinition: (id: string, state: FormStatus) => Promise<FormDefinition | undefined>
  getFormSecret: (formId: string, secretName: string) => Promise<string>
}
```

`getFormMetadata` is called on every request and should be fast. `getFormDefinition` is only called when the metadata signals the definition has changed, so it can be slower. `getFormMetadataById` is called by the status page to retrieve the submitted form's name by its ID — this allows the confirmation panel to display the correct form name even when the current URL belongs to a different form (for example, a shared feedback form). `getFormSecret` is used by components that need secrets (such as API keys) stored outside the form definition.

### Loading forms from files

For local or file-based forms, use the built-in `FileFormService`:

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

---

## formSubmissionService

Called during form submission to persist the submitted data and any uploaded files. The default implementation calls the Defra Forms submission API (`SUBMISSION_URL`), which is part of the Defra Forms hosting infrastructure. Teams not using that infrastructure must provide their own implementation.

```ts
interface FormSubmissionService {
  persistFiles: (
    files: { fileId: string; initiatedRetrievalKey: string }[],
    persistedRetrievalKey: string
  ) => Promise<object>
  submit: (data: SubmitPayload) => Promise<SubmitResponsePayload | undefined>
}
```

`submit` is called first with the structured form payload. The `SubmitResponsePayload` it returns (including CSV file IDs) is then passed to `outputService.submit`. `persistFiles` is called by `FileUploadField` during submission to move uploaded files from temporary to permanent storage.

Override this service if you are not using the Defra Forms hosting infrastructure, or if you handle file persistence differently.

---

## outputService

Called after `formSubmissionService.submit` completes. Its job is to deliver the submission — by default, as a GOV.UK Notify email.

```ts
interface OutputService {
  submit: (
    context: FormContext,
    request: FormRequestPayload,
    model: FormModel,
    emailAddress: string,
    items: DetailItem[],
    submitResponse: SubmitResponsePayload,
    formMetadata?: FormMetadata
  ) => Promise<void>
}
```

The default implementation (`notifyService`) formats the submission using the [output formatter](#output-format) configured on the form definition and sends it to `emailAddress` via GOV.UK Notify.

Override this service to deliver submissions differently — for example, publishing to an SNS topic, calling a webhook, or writing to a database. Your implementation receives the full `FormContext`, `FormModel`, `DetailItem[]` array, and the `SubmitResponsePayload` from `formSubmissionService`, giving you everything needed to format and route the submission however you need.

```js
await server.register({
  plugin,
  options: {
    services: {
      formsService,
      formSubmissionService,
      outputService: {
        async submit(context, request, model, emailAddress, items, submitResponse, formMetadata) {
          // publish to SNS, call a webhook, etc.
        }
      }
    }
  }
})
```

### Output format

If you use the default `notifyService`, the format of the email body is controlled by the `output` field in the form definition:

```json
{
  "output": {
    "audience": "human",
    "version": "1"
  }
}
```

| Value                 | Description                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `audience: "human"`   | Formats the submission as readable Markdown for a GOV.UK Notify email template. Default.                                                               |
| `audience: "machine"` | Formats the submission as a JSON payload, base64-encoded into the Notify email body. Useful when a downstream system reads the email programmatically. |

`version` selects the formatter version within that audience. Currently `"1"` is the only stable version for `human`; `"1"` and `"2"` are available for `machine`. Defaults to `"1"` when omitted.

If you provide a custom `outputService`, the `output` field has no effect — your service controls formatting entirely.

> **Note:** Page events always use the `machine/v1` payload format regardless of the `output` setting. The `output` field only affects what the default `notifyService` sends.
