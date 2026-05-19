# Pre-populating state

The engine supports pre-populating form state from URL query string parameters. This is useful when a calling system needs to pass known values into a form without the user re-entering them — for example, a reference number, an applicant ID, or a pre-selected option.

Pre-populated values are stored in the session and submitted with the form as if the user had entered them.

## How it works

Only query string parameters whose names match a `HiddenField` component in the form are copied into state. All other query parameters are ignored. This prevents arbitrary state injection — a caller cannot set a value that the form definition doesn't explicitly allow.

Pre-population fires inside `QuestionPageController`'s GET handler, which means it runs on any page whose controller is `QuestionPageController` or a subclass (`StartPageController`, `RepeatPageController`, `FileUploadPageController`, `SummaryPageController`). Display-only pages using the base `PageController` do not trigger it. The HiddenField can be defined on any page in the form — the engine searches the entire form definition for matching field names, not just the current page.

On GET requests the engine forwards query parameters (minus `returnUrl`) through any routing redirects, so params passed to the first page in the journey will survive until they reach a `QuestionPageController` page that processes them. Once pre-population fires the user is redirected to the same URL with the query string stripped, so the values are in session state and the URL is clean.

## Setup

### 1. Add a HiddenField to your form definition

The `HiddenField` can be placed on any page. The engine searches the entire form definition for matching field names, so it does not need to be on the page that receives the URL parameters.

```json
{
  "pages": [
    {
      "path": "/eligibility",
      "title": "Check eligibility",
      "components": [
        {
          "type": "HiddenField",
          "name": "applicantId",
          "title": "Applicant ID"
        }
      ]
    }
  ]
}
```

The `name` of the `HiddenField` must exactly match the query parameter name (case-sensitive).

### 2. Pass the value in the URL

Pass the parameter to any page in the form — typically the first page the user lands on. The engine forwards query parameters through GET redirects until a `QuestionPageController` page processes them.

```
https://your-service.gov.uk/your-form/start?applicantId=12345
```

The value `12345` will be stored in session state under the key `applicantId` and submitted alongside the user's other answers.

## Multiple parameters

Multiple `HiddenField` components and corresponding parameters are supported:

```json
{
  "type": "HiddenField",
  "name": "applicantId",
  "title": "Applicant ID"
},
{
  "type": "HiddenField",
  "name": "schemeCode",
  "title": "Scheme code"
}
```

```
?applicantId=12345&schemeCode=SRG-42
```

## What happens if a parameter has no matching HiddenField

The parameter is silently ignored. Only parameters whose names correspond to a `HiddenField` in the form definition are copied into state.

## What happens if the parameter is missing from the URL

The `HiddenField` is treated like any other required field — if `options.required` is `true` (the default), submission will fail validation unless the value was provided and stored in the session. Set `options.required: false` if the parameter is optional.
