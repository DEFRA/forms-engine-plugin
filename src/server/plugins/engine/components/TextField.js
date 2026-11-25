import joi from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class TextField extends FormComponent {
  /** @type {TextFieldComponent['options'] | EmailAddressFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {TextFieldComponent['schema']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  schema = this.schema

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /**
   * @param {TextFieldComponent | EmailAddressFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def
    const schema = 'schema' in def ? def.schema : {}

    let formSchema = joi.string().trim().label(this.label).required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    if (typeof schema.length !== 'number') {
      if (typeof schema.max === 'number') {
        formSchema = formSchema.max(schema.max)
      }

      if (typeof schema.min === 'number') {
        formSchema = formSchema.min(schema.min)
      }
    } else {
      formSchema = formSchema.length(schema.length)
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
        'string.pattern.base': message
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
   * @param {FormStateValue | FormState} [value]
   * @returns {value is string}
   */
  isValue(value) {
    return TextField.isText(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return TextField.getAllPossibleErrors()
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

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is string}
   */
  static isText(value) {
    return isFormValue(value) && typeof value === 'string'
  }
}

/**
 * @import { EmailAddressFieldComponent, TextFieldComponent } from '@defra/forms-model'
 * @import { StringSchema } from 'joi'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
