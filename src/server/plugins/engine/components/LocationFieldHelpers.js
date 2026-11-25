import { EN_GB } from '~/src/server/constants.js'
import { EastingNorthingField } from '~/src/server/plugins/engine/components/EastingNorthingField.js'
import { isFormValue } from '~/src/server/plugins/engine/components/FormComponent.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'

/**
 * @typedef {InstanceType<typeof EastingNorthingField>
 *   | InstanceType<typeof LatLongField>} LocationField
 */

/**
 * Lowercases the start of a message for concatenation.
 * Handles patterns like:
 * - "Enter latitude" -> "enter latitude"
 * - "Enter a valid latitude..." -> "enter a valid latitude..."
 * - "latitude must be..." -> "latitude must be..."
 * @param {string} message
 * @returns {string}
 */
function lowercaseMessageStart(message) {
  // Lowercase first character for a message
  return message.charAt(0).toLowerCase() + message.slice(1)
}

/**
 * @param {string[]} items
 * @param {Translator} [translator]
 * @returns {string}
 */
export function joinWithAnd(items, translator) {
  const and = translator?.t('common.and') ?? t('common.and', EN_GB)
  if (items.length === 2) {
    return `${items[0]} ${and} ${items[1]}`
  }

  const leading = items.slice(0, -1).join(', ')
  const last = items[items.length - 1]
  return `${leading} ${and} ${last}`
}

/**
 * @param {string[]} messages
 * @param {Translator} [translator]
 * @returns {string}
 */
export function formatErrorList(messages, translator) {
  if (!messages.length) {
    return ''
  }

  if (messages.length === 1) {
    return messages[0]
  }

  const formattedMessages = messages.map((msg, index) =>
    index === 0 ? msg : lowercaseMessageStart(msg)
  )

  return joinWithAnd(formattedMessages, translator)
}

/**
 * @param {...(string | undefined)} classNames
 */
export function mergeCssClasses(...classNames) {
  const tokens = classNames
    .flatMap((name) => name?.split(/\s+/) ?? [])
    .map((token) => token.trim())
    .filter(Boolean)

  if (!tokens.length) {
    return undefined
  }

  return Array.from(new Set(tokens)).join(' ')
}

/**
 * @param {FormSubmissionError[]} [errors]
 * @returns {FormSubmissionError[] | undefined}
 */
export function deduplicateErrorsByHref(errors) {
  if (!errors?.length) {
    return undefined
  }

  return errors.filter(
    (error, index, self) =>
      index === self.findIndex((err) => err.href === error.href)
  )
}

/**
 * @param {GeospatialField
 *   | OsGridRefField
 *   | LatLongField
 *   | EastingNorthingField} component
 */
export function getMapLayers(component) {
  const { mapLayers } = component.options
  const layers = []

  if (mapLayers?.sssi) {
    layers.push('sssi')
  }

  return layers.join(',')
}

/**
 * @param {LocationField} component
 * @param {ViewModel & {
 *   label: Label
 *   id: string
 *   name: string
 *   value: FormValue
 * }} viewModel
 * @param {RenderContext} context
 */
export function getLocationFieldViewModel(component, viewModel, context) {
  const { collection } = component
  const { fieldset: existingFieldset, label } = viewModel

  const { translator = component.model.createTranslator() } = context
  const subViewModels = collection.getViewModel(context)

  /** @type {string[]} */
  const fieldErrors = []
  subViewModels.forEach(({ model }) => {
    if (model.errorMessage?.text) {
      fieldErrors.push(model.errorMessage.text)
    }
  })

  const hasFieldErrors = fieldErrors.length > 0

  /** @type {DateInputItem[]} */
  const items = subViewModels.map(
    /**
     * @returns {DateInputItem}
     */
    ({ model }) => {
      let { label, type, value, classes, prefix, suffix, errorMessage } = model

      if (label) {
        label.toString = () => label.text
      }

      if (!isFormValue(value)) {
        value = undefined
      }

      /** @type {DateInputItem} */
      const baseItem = {
        label,
        id: model.id,
        name: model.name,
        type,
        value,
        classes: mergeCssClasses(
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
        fieldErrors.length === 1
          ? fieldErrors[0]
          : formatErrorList(fieldErrors, translator)
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
    items,
    mapLayers: getMapLayers(component),
    country:
      component instanceof EastingNorthingField
        ? component.options.countries?.at(0)
        : undefined,
    lang: translator.language
  }

  if (component.options.instructionText) {
    const { t, tComponent } = translator

    return {
      ...result,
      instructionSummary: t('components.locationFieldBase.howToFind'),
      instructionText:
        tComponent(component.def, 'instructionText') ||
        component.options.instructionText,
      t
    }
  }

  return result
}

/**
 * Validator factory for location-based fields.
 * This creates a validator that ensures all required fields are present.
 * @param {LocationField} component
 * @returns {CustomValidator}
 */
export function createLocationFieldValidator(component) {
  return (/** @type {FormPayload} */ payload, helpers) => {
    const { collection, name, options } = component

    const values = component.getFormValueFromState(
      component.getStateFromValidForm(payload)
    )

    /** @type {Context} */
    const context = {
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

/**
 * @import { Context, CustomValidator } from 'joi'
 * @import { GeospatialField } from '~/src/server/plugins/engine/components/GeospatialField.js'
 * @import { LatLongField } from '~/src/server/plugins/engine/components/LatLongField.js'
 * @import { OsGridRefField } from '~/src/server/plugins/engine/components/OsGridRefField.js'
 * @import { DateInputItem, Label, RenderContext, ViewModel } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormPayload, FormSubmissionError, FormValue } from '~/src/server/plugins/engine/types.js'
 */
