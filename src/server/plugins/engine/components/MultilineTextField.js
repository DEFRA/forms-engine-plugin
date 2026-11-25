import Joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class MultilineTextField extends FormComponent {
  /** @type {MultilineTextFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {MultilineTextFieldComponent['schema']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  schema = this.schema

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  isCharacterOrWordCount = false

  /**
   * @param {MultilineTextFieldComponent} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { schema, options } = def

    let formSchema = Joi.string()
      .replace(/\r\n/g, '\n')
      .trim()
      .label(this.label)
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    if (typeof schema.length !== 'number') {
      if (typeof schema.max === 'number') {
        formSchema = formSchema.max(schema.max)
        this.isCharacterOrWordCount = true
      }

      if (typeof schema.min === 'number') {
        formSchema = formSchema.min(schema.min)
      }
    } else {
      formSchema = formSchema.length(schema.length)
    }

    if (typeof options.maxWords === 'number') {
      formSchema = formSchema.custom(
        getValidatorMaxWords(this),
        'max words validation'
      )

      this.isCharacterOrWordCount = true
    }

    if (schema.regex) {
      const pattern = new RegExp(schema.regex)
      formSchema = formSchema.pattern(pattern)
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.max': message,
        'string.min': message,
        'string.length': message,
        'string.pattern.base': message,
        'string.maxWords': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    } else if (
      typeof schema.max === 'number' &&
      typeof schema.min === 'number'
    ) {
      const minMaxErrorText = this.buildMinMaxText(schema.min, schema.max)
      formSchema = formSchema.ruleset
        .min(schema.min)
        .max(schema.max)
        .message(minMaxErrorText)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { schema, options, isCharacterOrWordCount } = this

    const viewModel = super.getViewModel(context)
    let { maxlength, maxwords, rows } = viewModel

    if (schema.max) {
      maxlength = schema.max
    }

    if (options.maxWords) {
      maxwords = options.maxWords
    }

    if (options.rows) {
      rows = options.rows
    }

    return {
      ...viewModel,
      isCharacterOrWordCount,
      maxlength,
      maxwords,
      rows
    }
  }

  /**
   * @param {number} [min]
   * @param {number} [max]
   * @returns {string}
   */
  buildMinMaxText(min, max) {
    const minMaxError = messageTemplate.minMax
    return minMaxError
      .replace('{{#min}}', min ? min.toString() : '[min length]')
      .replace('{{#max}}', max ? max.toString() : '[max length]')
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    const staticErrors = MultilineTextField.getAllPossibleErrors()
    return {
      ...staticErrors,
      advancedSettingsErrors: [
        ...staticErrors.advancedSettingsErrors,
        {
          type: 'minMax',
          template: this.buildMinMaxText(this.schema.min, this.schema.max)
        }
      ]
    }
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [{ type: 'required', template: messageTemplate.required }],
      advancedSettingsErrors: [
        { type: 'min', template: messageTemplate.min },
        { type: 'max', template: messageTemplate.max }
      ]
    }
  }
}

/**
 * @param {MultilineTextField} component
 */
function getValidatorMaxWords(component) {
  /** @type {CustomValidator} */
  const validator = (/** @type {string} */ value, helpers) => {
    const { options } = component

    const {
      customValidationMessage: custom,
      maxWords: limit // See {{#limit}} variable
    } = options

    if (!limit || count(value) <= limit) {
      return value
    }

    return custom
      ? helpers.message({ custom }, { limit })
      : helpers.error('string.maxWords', { limit })
  }

  /**
   * Count the number of words in the given text
   * @see GOV.UK Frontend {@link https://github.com/alphagov/govuk-frontend/blob/v5.4.0/packages/govuk-frontend/src/govuk/components/character-count/character-count.mjs#L343 | Character count `maxwords` implementation}
   * @param {string} text
   */
  function count(text) {
    const tokens = text.match(/\S+/g) ?? []
    return tokens.length
  }

  return validator
}

/**
 * @import { MultilineTextFieldComponent } from '@defra/forms-model'
 * @import { CustomValidator, StringSchema } from 'joi'
 * @import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'
 */
