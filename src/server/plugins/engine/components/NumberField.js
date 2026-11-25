import joi from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { withCustomValidationOverrides } from '~/src/server/plugins/engine/components/helpers/index.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class NumberField extends FormComponent {
  /** @type {NumberFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {NumberFieldComponent['schema']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  schema = this.schema

  /** @type {NumberSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {NumberSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /**
   * @param {NumberFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options, schema } = def

    let formSchema = joi
      .number()
      .custom(getValidatorPrecision(this))
      .label(this.label)
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    } else {
      const messages = options.customValidationMessages

      formSchema = formSchema.empty('').messages({
        'any.required':
          messages?.['any.required'] ??
          /** @type {string} */ (messageTemplate.required)
      })
    }

    if (typeof schema.min === 'number') {
      formSchema = formSchema.min(schema.min)
    }

    if (typeof schema.max === 'number') {
      formSchema = formSchema.max(schema.max)
    }

    if (typeof schema.precision === 'number' && schema.precision <= 0) {
      formSchema = formSchema.integer()
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'number.base': message,
        'number.precision': message,
        'number.integer': message,
        'number.min': message,
        'number.max': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormValueFromState(state) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  getFormValue(value) {
    return this.isValue(value) ? value : undefined
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { options, schema } = this

    const viewModel = super.getViewModel(context)
    let { attributes, prefix, suffix, value } = viewModel

    if (typeof schema.precision === 'undefined' || schema.precision <= 0) {
      // If precision isn't provided or provided and
      // less than or equal to 0, use numeric inputmode
      attributes.inputmode = 'numeric'
    }

    if (options.prefix) {
      prefix = {
        text: options.prefix
      }
    }

    if (options.suffix) {
      suffix = {
        text: options.suffix
      }
    }

    // Allow any `toString()`-able value so non-numeric
    // values are shown alongside their error messages
    if (!isFormValue(value)) {
      value = undefined
    }

    return {
      ...viewModel,
      attributes,
      prefix,
      suffix,
      value
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  isValue(value) {
    return NumberField.isNumber(value)
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { customValidationMessage, customValidationMessages } = this.options
    const { t } = translator
    const defaults = {
      'any.required': buildValidationMessages(t).required,
      'number.base': buildValidationMessages(t).number,
      'number.precision': buildValidationMessages(t).numberPrecision,
      'number.integer': buildValidationMessages(t).numberInteger,
      'number.min': buildValidationMessages(t).numberMin,
      'number.max': buildValidationMessages(t).numberMax
    }

    return {
      [this.name]: withCustomValidationOverrides(
        defaults,
        customValidationMessage,
        customValidationMessages
      )
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return NumberField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        { type: 'numberInteger', template: messageTemplate.numberInteger }
      ],
      advancedSettingsErrors: [
        { type: 'numberMin', template: messageTemplate.numberMin },
        { type: 'numberMax', template: messageTemplate.numberMax },
        { type: 'numberPrecision', template: messageTemplate.numberPrecision }
      ]
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is number}
   */
  static isNumber(value) {
    return typeof value === 'number'
  }
}

/**
 * @param {NumberField} component
 */
export function getValidatorPrecision(component) {
  /** @type {CustomValidator} */
  const validator = (/** @type {number} */ value, helpers) => {
    const { options, schema } = component

    const { customValidationMessage: custom } = options
    const { precision: limit } = schema

    if (!limit || limit <= 0) {
      return value
    }

    const validationSchema = joi
      .number()
      .precision(limit)
      .prefs({ convert: false })

    try {
      return joi.attempt(value, validationSchema)
    } catch {
      return custom
        ? helpers.message({ custom }, { limit })
        : helpers.error('number.precision', { limit })
    }
  }

  return validator
}

/**
 * @import { NumberFieldComponent } from '@defra/forms-model'
 * @import { CustomValidator, NumberSchema } from 'joi'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/types/index.js'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
