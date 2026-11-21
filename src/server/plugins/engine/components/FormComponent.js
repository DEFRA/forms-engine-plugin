import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class FormComponent extends ComponentBase {
  /** @type {FormComponentsDef['type']} */
  type

  /** @type {FormComponentsDef['hint']} */
  hint

  /** @type {string} */
  label

  /** @type {string} */
  summaryLabel

  isFormComponent = true
  isAppendageStateSingleObject = false

  /**
   * @param {FormComponentsDef} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { hint, type } = def

    this.type = type
    this.hint = hint

    this.label = this.getLabel(def)
    this.summaryLabel = this.getSummaryLabel(def)
  }

  /**
   * @param {FormComponentsDef} def
   */
  getLabel(def) {
    if ('errorDescription' in def && def.errorDescription) {
      return def.errorDescription
    }

    return this.getSummaryLabel(def)
  }

  /**
   * @param {FormComponentsDef} def
   */
  getSummaryLabel(def) {
    if ('shortDescription' in def && def.shortDescription) {
      return def.shortDescription
    }

    return def.title
  }

  get keys() {
    const { collection, name } = this

    if (collection) {
      const { fields } = collection
      return [name, ...fields.map(({ name }) => name)]
    }

    return [name]
  }

  /**
   * @param {FormSubmissionState} state
   * @returns {FormPayload}
   */
  getFormDataFromState(state) {
    const { collection, name } = this

    if (collection) {
      return collection.getFormDataFromState(state)
    }

    return {
      [name]: this.getFormValue(state[name])
    }
  }

  /**
   * @param {FormSubmissionState} state
   * @returns {FormValue | FormPayload}
   */
  getFormValueFromState(state) {
    const { collection, name } = this

    if (collection) {
      return collection.getFormValueFromState(state)
    }

    return this.getFormValue(state[name])
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  getFormValue(value) {
    return this.isValue(value) ? value : undefined
  }

  /**
   * @param {FormPayload} payload
   * @returns {FormState}
   */
  getStateFromValidForm(payload) {
    const { collection, name } = this

    if (collection) {
      return collection.getStateFromValidForm(payload)
    }

    return {
      [name]: this.getFormValue(payload[name]) ?? null
    }
  }

  /**
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [_translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getErrors(errors, _translator) {
    const { name } = this

    // Filter component and child errors only
    const list = errors?.filter(
      (error) =>
        error.name === name ||
        error.path.includes(name) ||
        this.keys.includes(error.name)
    )

    if (!list?.length) {
      return
    }

    return list
  }

  /**
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError | undefined}
   */
  getFirstError(errors, translator) {
    return this.getErrors(errors, translator)?.[0]
  }

  /**
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getViewErrors(errors, translator) {
    const firstError = this.getFirstError(errors, translator)
    return firstError && [firstError]
  }

  /**
   * Override in composite fields to return translated Joi message overrides for
   * their sub-fields, applied at validation time so schema-level English messages
   * are replaced with the correct language. Return null to skip message patching.
   * The return object may contain message overrides at component-level, or sub-field-level.
   * This would allow different error message overrides per field within a collection e.g.
   * for EastingNothingField
   * @param {Translator} _translator
   * @returns {Record<string, LanguageMessages> | null}
   */
  getValidationMessagesOverride(_translator) {
    return null
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const {
      payload,
      errors,
      translator = this.model.createTranslator()
    } = context

    const { hint, name, options = {}, title, viewModel } = this

    const { t, tComponent } = translator

    const isRequired = !('required' in options) || options.required !== false
    const hideOptional = 'optionalText' in options && options.optionalText

    const resolvedTitle = tComponent(this.def, 'title') || title
    const optionalTag =
      !isRequired && !hideOptional ? ` ${t('common.optional')}` : ''
    const label = `${resolvedTitle}${optionalTag}`

    if (hint) {
      viewModel.hint = {
        text: tComponent(this.def, 'hint') || hint
      }
    }

    // Filter component errors only
    const componentErrors = this.getErrors(errors, translator)
    const componentError = this.getFirstError(componentErrors, translator)

    if (componentErrors) {
      viewModel.errors = componentErrors
    }

    if (componentError) {
      viewModel.errorMessage = {
        text: componentError.text
      }
    }

    return {
      ...viewModel,
      label: {
        text: label
      },
      id: name,
      name,
      value: payload[name]
    }
  }

  /**
   * @param {FormValue | FormPayload} value
   * @param {Translator} [_translator]
   * @returns {string}
   */
  getDisplayStringFromFormValue(value, _translator) {
    // Map selected values to text
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return this.isValue(value) ? value.toString() : ''
  }

  /**
   * @param {FormSubmissionState} state
   * @param {Translator} [translator]
   * @returns {string}
   */
  getDisplayStringFromState(state, translator) {
    const value = this.getFormValueFromState(state)
    return this.getDisplayStringFromFormValue(value, translator)
  }

  /**
   * @param {FormValue | FormPayload} value
   * @returns {Item['value'] | Item['value'][] | null}
   */
  getContextValueFromFormValue(value) {
    // Filter object field values
    if (this.isState(value)) {
      const values = Object.values(value).filter(isFormValue)
      return values.length ? values : null
    }

    // Filter array field values
    if (this.isValue(value) && Array.isArray(value)) {
      return value.filter(isFormValue)
    }

    return this.isValue(value) ? value : null
  }

  /**
   * @param {FormSubmissionState} state
   * @returns {Item['value'] | Item['value'][] | null}
   */
  getContextValueFromState(state) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is NonNullable<FormStateValue>}
   */
  isValue(value) {
    return isFormValue(value)
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is FormState}
   */
  isState(value) {
    return isFormState(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return FormComponent.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [],
      advancedSettingsErrors: []
    }
  }

  /**
   * @param {FormRequestPayload} _request
   * @param {FormMetadata} _metadata
   * @param {FormContext} _context
   * @returns {Promise<void>}
   */
  onSubmit(_request, _metadata, _context) {
    return Promise.resolve()
  }
}

/**
 * Check for form value
 * @param {unknown} [value]
 * @returns {value is string | number | boolean}
 */
export function isFormValue(value) {
  return (
    (typeof value === 'string' && value.length > 0) ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Check for form state with nested values
 * @param {unknown} [value]
 * @returns {value is FormState}
 */
export function isFormState(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  // Skip empty objects
  return !!Object.values(value).length
}

/**
 * Check for repeat list state
 * @param {unknown} [value]
 * @returns {value is RepeatListState}
 */
export function isRepeatState(value) {
  if (!Array.isArray(value)) {
    return false
  }

  // Skip checks when empty
  if (!value.length) {
    return true
  }

  return value.every(isRepeatValue)
}

/**
 * Check for repeat list value
 * @param {unknown} [value]
 * @returns {value is RepeatItemState}
 */
export function isRepeatValue(value) {
  return isFormState(value) && typeof value.itemId === 'string'
}

/**
 * Check for upload state
 * @param {unknown} [value]
 * @returns {value is UploadState}
 */
export function isUploadState(value) {
  if (!Array.isArray(value)) {
    return false
  }

  // Skip checks when empty
  if (!value.length) {
    return true
  }

  return value.every(isUploadValue)
}

/**
 * Check for geospatial state
 * @param {unknown} [value]
 * @returns {value is GeospatialState}
 */
export function isGeospatialState(value) {
  if (!Array.isArray(value)) {
    return false
  }

  // Skip checks when empty
  if (!value.length) {
    return true
  }

  return value.every(isGeospatialValue)
}

/**
 * Check for upload state value
 * @param {unknown} [value]
 * @returns {value is FileState}
 */
export function isUploadValue(value) {
  return isFormState(value) && typeof value.uploadId === 'string'
}

/**
 * Check for geospatial state value
 * @param {unknown} [value]
 * @returns {value is Feature}
 */
export function isGeospatialValue(value) {
  return (
    isFormState(value) &&
    typeof value.type === 'string' &&
    value.type === 'Feature'
  )
}

/**
 * @import { FormComponentsDef, FormMetadata, Item } from '@defra/forms-model'
 * @import { LanguageMessages } from 'joi'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormContext, FormRequestPayload } from '~/src/server/plugins/engine/types/index.js'
 * @import { ErrorMessageTemplateList, Feature, FileState, FormPayload, FormState, FormStateValue, FormSubmissionError, FormSubmissionState, FormValue, GeospatialState, RepeatItemState, RepeatListState, UploadState } from '~/src/server/plugins/engine/types.js'
 */
