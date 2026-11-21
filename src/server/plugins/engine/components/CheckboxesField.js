import joi from 'joi'

import { EN_GB } from '~/src/server/constants.js'
import { isFormValue } from '~/src/server/plugins/engine/components/FormComponent.js'
import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { t as tPlugin } from '~/src/server/plugins/engine/i18n/index.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class CheckboxesField extends SelectionControlField {
  /** @type {CheckboxesFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {CheckboxesFieldComponent['schema']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  schema = this.schema

  /** @type {ArraySchema<string[]> | ArraySchema<number[]>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {ArraySchema<string[]> | ArraySchema<number[]>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {{ min?: number, max?: number, length?: number }} */
  limits

  /**
   * @param {CheckboxesFieldComponent} def
   * @param {ConstructorParameters<typeof SelectionControlField>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { listType: type } = this
    const { options, schema } = def

    let formSchema =
      type === 'string'
        ? /** @type {ArraySchema<string[]>} */ (joi.array())
        : /** @type {ArraySchema<number[]>} */ (joi.array())

    const itemsSchema = joi[type]()
      .valid(...this.values)
      .label(this.label)

    formSchema = formSchema
      .items(itemsSchema)
      .single()
      .label(this.label)
      .required()

    /** @type {{ min?: number, max?: number, length?: number }} */
    const limits = {}

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    if (typeof schema?.length === 'number') {
      formSchema = formSchema.length(schema.length)
      limits.length = schema.length
    } else {
      if (typeof schema?.min === 'number') {
        formSchema = formSchema.min(schema.min)
        limits.min = schema.min
      }

      if (typeof schema?.max === 'number') {
        formSchema = formSchema.max(schema.max)
        limits.max = schema.max
      }
    }

    this.limits = limits

    formSchema = formSchema.messages(
      CheckboxesField.buildErrorMessages(EN_GB, limits)
    )

    this.formSchema = formSchema.default([])
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormValueFromState(state) {
    const { items, name } = this

    // State checkbox values
    const values = this.getFormValue(state[name]) ?? []

    // Map (or discard) state values to item values
    const selected = items
      .filter((item) => values.includes(item.value))
      .map((item) => item.value)

    return selected.length ? selected : undefined
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  getFormValue(value) {
    return this.isValue(value) ? value : undefined
  }

  /**
   * @param {(string | number | boolean)[] | undefined} selected
   * @param {Translator} [translator]
   */
  getDisplayStringFromFormValue(
    selected,
    translator = this.model.createTranslator()
  ) {
    const { items } = this

    if (!selected) {
      return ''
    }

    return items
      .filter((item) => selected.includes(item.value))
      .map((item) => translator.tListItem(item, 'text') || item.text)
      .join(', ')
  }

  /**
   * @param {(string | number | boolean)[] | undefined} values
   * @returns {(string | number | boolean)[]}
   */
  getContextValueFromFormValue(values) {
    /**
     * For evaluation context purposes, optional {@link CheckboxesField}
     * with an undefined value (i.e. nothing selected) should default to [].
     * This way conditions are not evaluated against `undefined` which throws errors.
     * Currently these errors are caught and the evaluation returns default `false`.
     * @see {@link QuestionPageController.getNextPath} for `undefined` return value
     * @see {@link FormModel.makeCondition} for try/catch block with default `false`
     * For negative conditions this is a problem because E.g.
     * The condition: 'selectedchecks' does not contain 'someval'
     * should return true IF 'selectedchecks' is undefined, not throw and return false.
     */
    return values ?? []
  }

  /**
   * @param {FormSubmissionState} state
   * @param {Translator} [translator]
   */
  getDisplayStringFromState(state, translator = this.model.createTranslator()) {
    const selected = this.getFormValueFromState(state) ?? []
    return this.getDisplayStringFromFormValue(selected, translator)
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    const values = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(values)
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { language } = translator
    return {
      [this.name]: CheckboxesField.buildErrorMessages(language, this.limits)
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return CheckboxesField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    const parentErrors = SelectionControlField.getAllPossibleErrors()

    return {
      ...parentErrors,
      advancedSettingsErrors: [
        ...parentErrors.advancedSettingsErrors,
        { type: 'array.min', template: messageTemplate.arrayMin },
        { type: 'array.max', template: messageTemplate.arrayMax },
        { type: 'array.length', template: messageTemplate.arrayLength }
      ]
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is Item['value'][]}
   */
  isValue(value) {
    if (!Array.isArray(value)) {
      return false
    }

    // Skip checks when empty
    if (!value.length) {
      return true
    }

    return value.every(isFormValue)
  }

  /**
   * @param {string} language
   * @param {{ min?: number, max?: number, length?: number }} [limits]
   */
  static buildErrorMessages(language, limits = {}) {
    return {
      'array.min': tPlugin('validation.arrayMin', language, {
        count: limits.min ?? 1
      }),
      'array.max': tPlugin('validation.arrayMax', language, {
        count: limits.max ?? 1
      }),
      'array.length': tPlugin('validation.arrayLength', language, {
        count: limits.length ?? 1
      })
    }
  }
}

/**
 * @import { CheckboxesFieldComponent, Item } from '@defra/forms-model'
 * @import { ArraySchema } from 'joi'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
