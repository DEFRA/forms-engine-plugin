import { type Context, type CustomValidator } from 'joi'

import { type EastingNorthingField } from '~/src/server/plugins/engine/components/EastingNorthingField.js'
import { isFormValue } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type LatLongField } from '~/src/server/plugins/engine/components/LatLongField.js'
import { markdown } from '~/src/server/plugins/engine/components/markdownParser.js'
import {
  type DateInputItem,
  type Label,
  type ViewModel
} from '~/src/server/plugins/engine/components/types.js'
import {
  type FormPayload,
  type FormSubmissionError,
  type FormValue
} from '~/src/server/plugins/engine/types.js'

export type LocationField =
  | InstanceType<typeof EastingNorthingField>
  | InstanceType<typeof LatLongField>

export function extractEnterFieldNames(messages: string[]): string[] | null {
  const enterPattern = /^Enter (.+)$/
  const fieldNames: string[] = []

  for (const msg of messages) {
    const match = enterPattern.exec(msg)
    if (!match) {
      return null
    }
    fieldNames.push(match[1])
  }

  return fieldNames
}

export function joinWithAnd(items: string[]): string {
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }

  const leading = items.slice(0, -1).join(', ')
  const last = items[items.length - 1]
  return `${leading} and ${last}`
}

export function formatErrorList(messages: string[]): string {
  if (!messages.length) {
    return ''
  }

  if (messages.length === 1) {
    return messages[0]
  }

  const fieldNames = extractEnterFieldNames(messages)

  if (fieldNames) {
    return `Enter ${joinWithAnd(fieldNames)}`
  }

  return joinWithAnd(messages)
}

export function mergeClasses(...classNames: (string | undefined)[]) {
  const tokens = classNames
    .flatMap((name) => name?.split(/\s+/) ?? [])
    .map((token) => token.trim())
    .filter(Boolean)

  if (!tokens.length) {
    return undefined
  }

  return Array.from(new Set(tokens)).join(' ')
}

export function getLocationFieldViewModel(
  component: LocationField,
  viewModel: ViewModel & {
    label: Label
    id: string
    name: string
    value: FormValue
  },
  payload: FormPayload,
  errors?: FormSubmissionError[]
) {
  const { collection } = component
  const { fieldset: existingFieldset, label } = viewModel

  const subViewModels = collection.getViewModel(payload, errors)

  const fieldErrors: string[] = []
  subViewModels.forEach(({ model }) => {
    if (model.errorMessage?.text) {
      fieldErrors.push(model.errorMessage.text)
    }
  })

  const hasFieldErrors = fieldErrors.length > 0

  const items: DateInputItem[] = subViewModels.map(
    ({ model }): DateInputItem => {
      let { label, type, value, classes, prefix, suffix, errorMessage } = model

      if (label) {
        label.toString = () => label.text
      }

      if (!isFormValue(value)) {
        value = undefined
      }

      const baseItem: DateInputItem = {
        label,
        id: model.id,
        name: model.name,
        type,
        value,
        classes: mergeClasses(
          classes,
          hasFieldErrors ? 'govuk-input--error' : undefined
        ),
        prefix,
        suffix
      }

      if (!hasFieldErrors && errorMessage) {
        baseItem.errorMessage = errorMessage
      }

      return baseItem
    }
  )

  const showFieldsetError =
    hasFieldErrors || Boolean(viewModel.errorMessage?.text)

  viewModel.showFieldsetError = showFieldsetError

  if (hasFieldErrors) {
    viewModel.errorMessage = {
      text:
        fieldErrors.length === 1 ? fieldErrors[0] : formatErrorList(fieldErrors)
    }
  }

  const fieldset = existingFieldset ?? {
    legend: {
      text: label.text,
      classes: 'govuk-fieldset__legend--m'
    }
  }

  const result = {
    ...viewModel,
    fieldset,
    items
  }

  if (component.options.instructionText) {
    return {
      ...result,
      instructionText: markdown.parse(component.options.instructionText, {
        async: false
      })
    }
  }

  return result
}

/**
 * Validator factory for location-based fields.
 * This creates a validator that ensures all required fields are present.
 */
export function createLocationFieldValidator(
  component: LocationField
): CustomValidator {
  return (payload: FormPayload, helpers) => {
    const { collection, name, options } = component

    const values = component.getFormValueFromState(
      component.getStateFromValidForm(payload)
    )

    const context: Context = {
      missing: collection.keys,
      key: name
    }

    if (!component.isState(values)) {
      return options.required !== false
        ? helpers.error('object.required', context)
        : payload
    }

    return payload
  }
}
