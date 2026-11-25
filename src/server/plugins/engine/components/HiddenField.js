import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class HiddenField extends FormComponent {
  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {TextFieldComponent['schema']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  schema = this.schema

  /** @type {TextFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @param {HiddenFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def

    let formSchema = joi.string().trim().label(this.label).required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.schema = {}
    this.options = {}
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
    return HiddenField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [{ type: 'required', template: messageTemplate.required }],
      advancedSettingsErrors: []
    }
  }
}

/**
 * @import { HiddenFieldComponent, TextFieldComponent } from '@defra/forms-model'
 * @import { StringSchema } from 'joi'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
