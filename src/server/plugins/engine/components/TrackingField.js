import joi from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class TrackingField extends FormComponent {
  /** @type {BooleanSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {BooleanSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {TrackingFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @param {TrackingFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const formSchema = joi.boolean().valid(true).label(this.label).required()

    this.formSchema = formSchema.default(false)
    this.stateSchema = formSchema.default(null).allow(null)
    this.schema = /** @type {ComponentBase['schema']} */ ({})
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
   * @returns {value is true}
   */
  isValue(value) {
    return TrackingField.isTracking(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return TrackingField.getAllPossibleErrors()
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is true}
   */
  static isTracking(value) {
    return isFormValue(value) && typeof value === 'boolean'
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
 * @import { TrackingFieldComponent } from '@defra/forms-model'
 * @import { BooleanSchema } from 'joi'
 * @import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
