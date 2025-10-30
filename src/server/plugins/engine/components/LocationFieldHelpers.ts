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
  const { collection, name } = component
  const { fieldset: existingFieldset, label } = viewModel

  // Check for component errors only
  const hasError = errors?.some((error) => error.name === name)

  // Use the component collection to generate the subitems
  const items: DateInputItem[] = collection
    .getViewModel(payload, errors)
    .map(({ model }): DateInputItem => {
      let { label, type, value, classes, prefix, suffix, errorMessage } = model

      if (label) {
        label.toString = () => label.text // Use string labels
      }

      if (hasError || errorMessage) {
        classes = `${classes ?? ''} govuk-input--error`.trim()
      }

      // Allow any `toString()`-able value so non-numeric
      // values are shown alongside their error messages
      if (!isFormValue(value)) {
        value = undefined
      }

      return {
        label,
        id: model.id,
        name: model.name,
        type,
        value,
        classes,
        prefix,
        suffix
      }
    })

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
