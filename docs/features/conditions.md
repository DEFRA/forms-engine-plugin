# Conditions

Conditions make pages in a form journey conditional. When a condition is assigned to a page, the engine evaluates it at runtime and skips the page if the condition does not pass. Pages are always traversed in the order they appear in the `pages` array — conditions cause individual pages to be bypassed, not re-ordered.

- [Defining a condition](#defining-a-condition)
- [Assigning a condition to a page](#assigning-a-condition-to-a-page)
- [Condition items](#condition-items)
  - [Value comparison](#value-comparison)
  - [Condition reference](#condition-reference)
- [Condition types](#condition-types)
  - [StringValue](#stringvalue)
  - [ListItemRef](#listitemref)
  - [BooleanValue](#booleanvalue)
  - [NumberValue](#numbervalue)
  - [DateValue](#datevalue)
  - [RelativeDate](#relativedate)
- [Operators](#operators)
  - [String operators](#string-operators)
  - [List operators](#list-operators)
  - [Boolean operators](#boolean-operators)
  - [Number operators](#number-operators)
  - [Date operators](#date-operators)
- [Multi-item conditions](#multi-item-conditions)
- [Example](#example)

## Defining a condition

Add a `conditions` array to your form definition. Each condition has a unique `id`, a human-readable `displayName`, and one or more `items` specifying what is evaluated.

```json
{
  "conditions": [
    {
      "id": "8a3f6bb2-c305-410a-a037-7375be839105",
      "displayName": "applicantIsUKResident",
      "items": [
        {
          "id": "f03a6735-0f7c-4dc9-b65c-7c42fcd0d189",
          "componentId": "fa67e20d-a89b-4e8a-85ec-8a63923b7137",
          "operator": "is",
          "type": "BooleanValue",
          "value": true
        }
      ]
    }
  ]
}
```

## Assigning a condition to a page

Set the `condition` property on a page to the condition's `id`. The engine evaluates the condition when calculating the user's next destination — pages whose condition does not pass are silently skipped.

```json
{
  "pages": [
    {
      "id": "449c053b-9201-4312-9a75-187ac1b720eb",
      "title": "Tell us where you live",
      "path": "/where-do-you-live",
      "condition": "8a3f6bb2-c305-410a-a037-7375be839105",
      "components": []
    }
  ]
}
```

## Condition items

Items in a condition's `items` array take one of two forms:

| Form                                        | When to use                                              |
| ------------------------------------------- | -------------------------------------------------------- |
| [Value comparison](#value-comparison)       | Compare a component's answer against a specific value    |
| [Condition reference](#condition-reference) | Compose conditions by referencing other named conditions |

### Value comparison

A value comparison item checks a component's answer against a target. It requires `componentId`, `operator`, `type`, and `value`.

```json
{
  "id": "f03a6735-0f7c-4dc9-b65c-7c42fcd0d189",
  "componentId": "87b987e8-bcf9-4ff9-92af-57c34c45995a",
  "operator": "is",
  "type": "StringValue",
  "value": "Bob"
}
```

See [Condition types](#condition-types) for the full list of `type` values, and [Operators](#operators) for which operators apply to each type.

### Condition reference

An optional way to combine existing conditions without duplicating logic. If you already have an `isOver18` condition and need a new `isOver18AndLivesInScotland` condition, you can reference `isOver18` directly rather than repeating its items. If the age check ever changes, you update it in one place and every condition that references it picks up the change automatically.

Most conditions are simple value comparisons and don't need this. It's worth considering when you find yourself repeating the same checks across multiple conditions.

```json
{
  "conditions": [
    {
      "id": "d1f9fcc7-f098-47e7-9d31-4f5ee57ba985",
      "displayName": "isOver18",
      "items": [
        {
          "id": "c833b177-0cba-49de-b670-a297c6db45b8",
          "componentId": "c977e76e-49ab-4443-b93e-e19e8d9c81ac",
          "operator": "is",
          "type": "BooleanValue",
          "value": true
        }
      ]
    },
    {
      "id": "fa67e20d-a89b-4e8a-85ec-8a63923b7137",
      "displayName": "livesInScotland",
      "items": [
        {
          "id": "b7c2d456-e789-0123-45ab-cdef01234567",
          "componentId": "2e088e75-c6f6-4a0f-8f1f-3cee14c71e4c",
          "operator": "is",
          "type": "StringValue",
          "value": "scotland"
        }
      ]
    },
    {
      "id": "db43c6bc-9ce6-478b-8345-4fff5eff2ba3",
      "displayName": "isOver18AndLivesInScotland",
      "coordinator": "and",
      "items": [
        {
          "id": "a906e343-5d0e-421e-81a4-3afa68fac011",
          "conditionId": "d1f9fcc7-f098-47e7-9d31-4f5ee57ba985"
        },
        {
          "id": "3b306a85-a365-4bfc-b9f0-3f868e896da2",
          "conditionId": "fa67e20d-a89b-4e8a-85ec-8a63923b7137"
        }
      ]
    }
  ]
}
```

Condition references can be nested to arbitrary depth — a composed condition can itself be referenced in another composed condition.

## Condition types

The `type` field on a value comparison item determines the format of `value` and which operators are applicable.

| Type                            | Use with                                  | `value` format                    |
| ------------------------------- | ----------------------------------------- | --------------------------------- |
| [`StringValue`](#stringvalue)   | TextField, MultilineTextField             | String                            |
| [`ListItemRef`](#listitemref)   | RadiosField, SelectField, CheckboxesField | Object with `listId` and `itemId` |
| [`BooleanValue`](#booleanvalue) | YesNoField                                | `true` or `false`                 |
| [`NumberValue`](#numbervalue)   | NumberField                               | Number                            |
| [`DateValue`](#datevalue)       | DatePartsField — absolute dates           | ISO date string (`"YYYY-MM-DD"`)  |
| [`RelativeDate`](#relativedate) | DatePartsField — relative dates           | Object                            |

### StringValue

Used with text input components — TextField and MultilineTextField.

```json
{
  "componentId": "87b987e8-bcf9-4ff9-92af-57c34c45995a",
  "operator": "is",
  "type": "StringValue",
  "value": "Bob"
}
```

### ListItemRef

Used with list-backed selection components — RadiosField, SelectField, and CheckboxesField. The `value` references the list and item by their IDs.

```json
{
  "componentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "operator": "is",
  "type": "ListItemRef",
  "value": {
    "listId": "23d5309e-1aed-427d-b8ee-87e14f673e7f",
    "itemId": "bedd5984-fa95-48f9-87e2-1089d66574b2"
  }
}
```

For Checkboxes (multi-select), use `contains` or `does not contain`:

```json
{
  "componentId": "f0f67bf7-cdbb-4247-9f3c-8cd919183968",
  "operator": "contains",
  "type": "ListItemRef",
  "value": {
    "listId": "0e047f83-dbb6-4c82-b709-f9dbaddf8644",
    "itemId": "0c546ae1-897e-48d0-9388-b0902fe23baf"
  }
}
```

### BooleanValue

Used with YesNoField. Value must be the boolean `true` or `false`.

```json
{
  "componentId": "c977e76e-49ab-4443-b93e-e19e8d9c81ac",
  "operator": "is",
  "type": "BooleanValue",
  "value": true
}
```

### NumberValue

Used with NumberField. Value must be a number.

```json
{
  "componentId": "2e088e75-c6f6-4a0f-8f1f-3cee14c71e4c",
  "operator": "is more than",
  "type": "NumberValue",
  "value": 100
}
```

### DateValue

Used with DatePartsField for comparisons against a specific absolute date. Value must be an ISO date string.

```json
{
  "componentId": "3733ff68-3c72-4e42-9362-a792217d235d",
  "operator": "is before",
  "type": "DateValue",
  "value": "2001-01-01"
}
```

### RelativeDate

Used with DatePartsField for comparisons against a date calculated relative to today — for example, "at least 18 years in the past" for an age check.

```json
{
  "componentId": "34567ef1-49df-46fb-b0ed-2e0922c2b0d9",
  "operator": "is at least",
  "type": "RelativeDate",
  "value": {
    "period": 18,
    "unit": "years",
    "direction": "in the past"
  }
}
```

| Property    | Values                               |
| ----------- | ------------------------------------ |
| `period`    | Positive integer                     |
| `unit`      | `"days"`, `"months"`, `"years"`      |
| `direction` | `"in the past"` or `"in the future"` |

## Operators

### String operators

Used with `StringValue`.

| Operator          | Description                                   |
| ----------------- | --------------------------------------------- |
| `is`              | Answer exactly matches the value              |
| `is not`          | Answer does not exactly match                 |
| `is longer than`  | Answer character count exceeds the value      |
| `is shorter than` | Answer character count is less than the value |
| `has length`      | Answer character count equals the value       |

### List operators

Used with `ListItemRef`.

| Operator           | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `is`               | Selection matches the referenced item — use with Radios, Select |
| `is not`           | Selection does not match                                        |
| `contains`         | Multi-select includes the referenced item — use with Checkboxes |
| `does not contain` | Multi-select does not include the item                          |

### Boolean operators

Used with `BooleanValue`.

| Operator | Description                      |
| -------- | -------------------------------- |
| `is`     | Answer matches `true` or `false` |
| `is not` | Answer does not match            |

### Number operators

Used with `NumberValue`.

| Operator       | Description                                  |
| -------------- | -------------------------------------------- |
| `is`           | Answer exactly matches                       |
| `is not`       | Answer does not match                        |
| `is more than` | Answer is greater than the value             |
| `is less than` | Answer is less than the value                |
| `is at least`  | Answer is greater than or equal to the value |
| `is at most`   | Answer is less than or equal to the value    |

### Date operators

Used with `DateValue` for comparisons against a specific date:

| Operator    | Description                     |
| ----------- | ------------------------------- |
| `is`        | Date exactly matches            |
| `is not`    | Date does not match             |
| `is before` | Date is earlier than the target |
| `is after`  | Date is later than the target   |

Used with `RelativeDate` for comparisons relative to today:

| Operator       | Description                                      |
| -------------- | ------------------------------------------------ |
| `is at least`  | Date is at least N units in the given direction  |
| `is at most`   | Date is at most N units in the given direction   |
| `is less than` | Date is less than N units in the given direction |
| `is more than` | Date is more than N units in the given direction |

## Multi-item conditions

When a condition has two or more items, add a `coordinator` to specify how they are combined.

```json
{
  "id": "0e7ae320-c876-40c2-8803-7848cc49689b",
  "displayName": "applicantIsEligible",
  "coordinator": "and",
  "items": [
    {
      "id": "f03a6735-0f7c-4dc9-b65c-7c42fcd0d189",
      "componentId": "fa67e20d-a89b-4e8a-85ec-8a63923b7137",
      "operator": "is",
      "type": "BooleanValue",
      "value": true
    },
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "componentId": "2e088e75-c6f6-4a0f-8f1f-3cee14c71e4c",
      "operator": "is not",
      "type": "StringValue",
      "value": "ineligible"
    }
  ]
}
```

| Coordinator | Behaviour                   |
| ----------- | --------------------------- |
| `"and"`     | All items must pass         |
| `"or"`      | At least one item must pass |

## Example

This example asks users which animals they prefer. The follow-up page only appears when the condition passes — the user selected "Monkey".

```json
{
  "pages": [
    {
      "id": "a86ea4ba-ae3b-4324-9acd-3a3f347cb0ec",
      "title": "What are your favourite animals",
      "path": "/favourite-animal",
      "components": [
        {
          "id": "f0f67bf7-cdbb-4247-9f3c-8cd919183968",
          "type": "CheckboxesField",
          "title": "What are your favourite animals",
          "name": "nUaCCW",
          "shortDescription": "Favourite animals",
          "options": { "required": true },
          "schema": {},
          "list": "0e047f83-dbb6-4c82-b709-f9dbaddf8644"
        }
      ]
    },
    {
      "id": "c12b3e99-7374-4b2a-9f81-d6e4c7891234",
      "title": "You picked a monkey as your favourite animal",
      "path": "/monkey-chosen",
      "condition": "8a3f6bb2-c305-410a-a037-7375be839105",
      "components": [
        {
          "id": "d7f3a456-1234-5678-90ab-cdef01234567",
          "type": "Markdown",
          "name": "mWnPqR",
          "content": "What a fantastic choice."
        }
      ]
    }
  ],
  "conditions": [
    {
      "id": "8a3f6bb2-c305-410a-a037-7375be839105",
      "displayName": "FaveAnimalIsMonkey",
      "items": [
        {
          "id": "86e63584-12a8-4f2b-b51b-49765518b811",
          "componentId": "f0f67bf7-cdbb-4247-9f3c-8cd919183968",
          "operator": "contains",
          "type": "ListItemRef",
          "value": {
            "listId": "0e047f83-dbb6-4c82-b709-f9dbaddf8644",
            "itemId": "0c546ae1-897e-48d0-9388-b0902fe23baf"
          }
        }
      ]
    }
  ],
  "lists": [
    {
      "id": "0e047f83-dbb6-4c82-b709-f9dbaddf8644",
      "title": "Animals",
      "type": "string",
      "items": [
        { "id": "fb3519b2-c6c7-40b6-8e03-2fb0db6d4f32", "text": "Horse", "value": "horse" },
        { "id": "0c546ae1-897e-48d0-9388-b0902fe23baf", "text": "Monkey", "value": "monkey" },
        { "id": "39f6fa65-1781-4569-9ba3-d8d13931f036", "text": "Giraffe", "value": "giraffe" }
      ]
    }
  ],
  "engine": "V2",
  "schema": 2
}
```
