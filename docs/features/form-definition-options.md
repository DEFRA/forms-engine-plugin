# Form definition options

These are top-level fields on the form definition that control global behaviour — things like how the reference number is displayed, what appears on the summary page, and whether user feedback is enabled. They sit alongside `pages`, `conditions`, `lists`, and `sections` in the form definition object.

- [Lists](#lists)
  - [Defining lists](#defining-lists)
  - [Assigning a list to a component](#assigning-a-list-to-a-component)
- [Sections](#sections)
  - [Defining sections](#defining-sections)
  - [Assigning pages to a section](#assigning-pages-to-a-section)
- [Options](#options)
  - [Reference number display](#reference-number-display)
  - [Reference number prefix](#reference-number-prefix)
  - [User feedback](#user-feedback)
- [Phase banner](#phase-banner)
- [Declaration](#declaration)

## Lists

Lists define the available options for selection components — RadiosField, CheckboxesField, SelectField, AutocompleteField, and the List display component. They are defined once at the top level of the form definition and referenced by components and conditions by ID.

### Defining lists

Add a `lists` array to the form definition. Each list has a unique `id`, a human-readable `title`, a value `type`, and an `items` array.

```json
{
  "lists": [
    {
      "id": "0e047f83-dbb6-4c82-b709-f9dbaddf8644",
      "title": "Countries",
      "type": "string",
      "items": [
        {
          "id": "fb3519b2-c6c7-40b6-8e03-2fb0db6d4f32",
          "text": "England",
          "value": "england"
        },
        {
          "id": "0c546ae1-897e-48d0-9388-b0902fe23baf",
          "text": "Scotland",
          "value": "scotland"
        },
        {
          "id": "39f6fa65-1781-4569-9ba3-d8d13931f036",
          "text": "Wales",
          "value": "wales"
        }
      ]
    }
  ]
}
```

| Property | Type     | Required | Description                                         |
| -------- | -------- | -------- | --------------------------------------------------- |
| `id`     | `string` | Yes      | Unique identifier (UUID) for this list.             |
| `title`  | `string` | Yes      | Human-readable name for the list.                   |
| `type`   | `string` | Yes      | Value type for all items: `"string"` or `"number"`. |
| `items`  | `array`  | Yes      | The selectable options.                             |

Each item in `items`:

| Property | Type               | Required | Description                                                                                |
| -------- | ------------------ | -------- | ------------------------------------------------------------------------------------------ |
| `id`     | `string`           | Yes      | Unique identifier (UUID) for this item. Used by `ListItemRef` conditions.                  |
| `text`   | `string`           | Yes      | Label displayed to the user.                                                               |
| `value`  | `string \| number` | Yes      | Value stored in the form state when this option is selected. Must match the list's `type`. |

### Assigning a list to a component

Set the `list` property on a component to the list's `id`:

```json
{
  "type": "RadiosField",
  "name": "country",
  "title": "Which country do you live in?",
  "list": "0e047f83-dbb6-4c82-b709-f9dbaddf8644"
}
```

Item `id` values are used when writing [conditions](./conditions.md) that compare against a specific list option — see [`ListItemRef`](./conditions.md#listitemref).

---

## Sections

Sections group pages together under a named heading in the check-your-answers summary. Pages in the same section are listed under a shared `<h2>` on the summary page. Pages without a section appear under a default heading.

### Defining sections

Add a `sections` array to the form definition:

```json
{
  "sections": [
    {
      "name": "applicant",
      "title": "About you"
    },
    {
      "name": "application",
      "title": "Your application",
      "hideTitle": true
    }
  ]
}
```

| Property    | Type      | Required | Description                                                                    |
| ----------- | --------- | -------- | ------------------------------------------------------------------------------ |
| `name`      | `string`  | Yes      | Identifier used to reference this section from a page definition.              |
| `title`     | `string`  | Yes      | Heading displayed above the section's rows on the check-your-answers page.     |
| `hideTitle` | `boolean` | No       | When `true`, the section heading is suppressed on the check-your-answers page. |

### Assigning pages to a section

Set the `section` property on a page definition to the section's `name`:

```json
{
  "pages": [
    {
      "path": "/full-name",
      "title": "What is your full name?",
      "section": "applicant",
      "components": [...]
    },
    {
      "path": "/date-of-birth",
      "title": "What is your date of birth?",
      "section": "applicant",
      "components": [...]
    },
    {
      "path": "/project-description",
      "title": "Describe your project",
      "section": "application",
      "components": [...]
    }
  ]
}
```

Pages not assigned to a section appear in a separate, unlabelled group at the end of the summary.

---

## Options

The `options` object controls a handful of form-wide behaviours.

```json
{
  "options": {
    "showReferenceNumber": true,
    "disableUserFeedback": false
  }
}
```

### Reference number display

`options.showReferenceNumber` — when `true`, the auto-generated reference number is displayed inside the GOV.UK panel on the [Status page](./pages/status-page.mdx) after submission.

```json
{
  "options": {
    "showReferenceNumber": true
  }
}
```

The reference number is always generated for every form session regardless of this setting. The setting only controls whether it is visible to the user on the confirmation screen.

### Reference number prefix

`metadata.referenceNumberPrefix` — a string prepended to the auto-generated reference number. Without a prefix the format is `XXX-XXX-XXX`. With a prefix the format is `PREFIX-XXX-XXX`.

```json
{
  "metadata": {
    "referenceNumberPrefix": "APP"
  }
}
```

An `APP` prefix produces reference numbers like `APP-R3K-2WN`. The characters after the prefix are drawn from an unambiguous alphabet (no `0`, `O`, `1`, `I`, etc.) and filtered to avoid profanity.

### User feedback

`options.disableUserFeedback` — when `true`, the "What do you think of this service?" feedback link is suppressed on all pages, including the confirmation page. Defaults to `false`.

```json
{
  "options": {
    "disableUserFeedback": true
  }
}
```

---

## Phase banner

`phaseBanner.phase` sets the phase label shown in the [GOV.UK phase banner](https://design-system.service.gov.uk/components/phase-banner/) on every page of the form. Accepted values are `"alpha"` and `"beta"`.

```json
{
  "phaseBanner": {
    "phase": "beta"
  }
}
```

The value is exposed as the `phaseTag` template variable. See [Page elements](./page-elements.mdx#phase-banner) for how to wire it into your base layout.

---

## Declaration

`declaration` adds a "Declaration" heading followed by rendered HTML immediately above the submit button on the check-your-answers page. Use it for legal declarations the user implicitly agrees to by submitting.

```json
{
  "declaration": "<p class=\"govuk-body\">By submitting this form you confirm the information is correct to the best of your knowledge.</p>"
}
```

The value is rendered as raw HTML (marked safe). Unlike the `DeclarationField` component, this does not require an explicit checkbox — it is purely presentational.
