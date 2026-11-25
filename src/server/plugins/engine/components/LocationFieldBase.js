import joi from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  addClassOptionIfNone,
  withCustomValidationOverrides
} from '~/src/server/plugins/engine/components/helpers/index.js'

/**
 * @typedef {{
 *   instructionText?: string
 *   required?: boolean
 *   customValidationMessage?: string
 *   customValidationMessages?: LanguageMessages
 *   classes?: string
 * }} LocationFieldOptions
 */

/**
 * @typedef {{
 *   pattern: RegExp
 *   patternErrorMessage: JoiExpression
 *   requiredMessage: JoiExpression
 * }} ValidationConfig
 */

/**
 * Abstract base class for location-based field components
 * @abstract
 */
export class LocationFieldBase extends FormComponent {
  /** @type {LocationFieldOptions} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {string | undefined} */
  instructionText

  /**
   * @abstract
   * @protected
   * @param {Translator | undefined} translator
   * @returns {ValidationConfig}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the stub keeps the parameter that subclasses implement
  getValidationConfig(translator) {
    throw new Error('Not implemented')
  }

  /**
   * @abstract
   * @protected
   * @returns {{
   *   type: string
   *   template: JoiExpression
   * }[]}
   */
  getErrorTemplates() {
    throw new Error('Not implemented')
  }

  /**
   * @param {FormComponentsDef} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def
    const locationOptions = /** @type {LocationFieldOptions} */ (options)
    this.instructionText = locationOptions.instructionText

    addClassOptionIfNone(locationOptions, 'govuk-input--width-10')

    const config = this.getValidationConfig(undefined)
    const { requiredMessage } = config

    const messages = /** @type {LanguageMessages} */ ({
      'any.required': requiredMessage,
      'string.empty': requiredMessage,
      'string.pattern.base': config.patternErrorMessage
    })

    let formSchema = joi
      .string()
      .trim()
      .label(this.label)
      .required()
      .pattern(config.pattern)
      .messages(messages)

    if (locationOptions.required === false) {
      formSchema = formSchema.allow('')
    }

    if (locationOptions.customValidationMessage) {
      const message = locationOptions.customValidationMessage
      const messageKeys = [
        'any.required',
        'string.empty',
        'string.pattern.base'
      ]

      const messages = messageKeys.reduce((acc, key) => {
        acc[key] = message
        return acc
      }, /** @type {LanguageMessages} */ ({}))

      formSchema = formSchema.messages(messages)
    } else if (locationOptions.customValidationMessages) {
      formSchema = formSchema.messages(locationOptions.customValidationMessages)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = locationOptions
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
   * @param {FormStateValue | FormState} [value]
   * @returns {value is string}
   */
  isValue(value) {
    return LocationFieldBase.isText(value)
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { translator = this.model.createTranslator() } = context

    const viewModel = super.getViewModel(context)

    Object.assign(viewModel, {
      lang: translator.language
    })

    if (this.instructionText) {
      const { tComponent } = translator
      return {
        ...viewModel,
        instructionText:
          tComponent(this.def, 'instructionText') || this.instructionText
      }
    }

    return viewModel
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { customValidationMessage, customValidationMessages } = this.options
    const config = this.getValidationConfig(translator)
    const defaults = {
      'any.required': config.requiredMessage,
      'string.empty': config.requiredMessage,
      'string.pattern.base': config.patternErrorMessage
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
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    const config = this.getValidationConfig(undefined)

    return {
      baseErrors: [
        {
          type: 'required',
          template: config.requiredMessage
        },
        ...this.getErrorTemplates()
      ],
      advancedSettingsErrors: []
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is string}
   */
  static isText(value) {
    return isFormValue(value) && typeof value === 'string'
  }
}

/**
 * @import { FormComponentsDef } from '@defra/forms-model'
 * @import { JoiExpression, LanguageMessages, StringSchema } from 'joi'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/types/index.js'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
