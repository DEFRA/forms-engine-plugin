import { type TrackingFieldComponent } from '@defra/forms-model'
import joi, { type BooleanSchema } from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormState,
  type FormStateValue,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class TrackingField extends FormComponent {
  declare formSchema: BooleanSchema
  declare stateSchema: BooleanSchema
  declare options: TrackingFieldComponent['options']

  constructor(
    def: TrackingFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const formSchema = joi.boolean().valid(true).label(this.label).required()

    this.formSchema = formSchema.default(false)
    this.stateSchema = formSchema.default(null).allow(null)
    this.schema = {}
    this.options = {}
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  isValue(value?: FormStateValue | FormState): value is true {
    return TrackingField.isTracking(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return TrackingField.getAllPossibleErrors()
  }

  static isTracking(value?: FormStateValue | FormState): value is true {
    return isFormValue(value) && typeof value === 'boolean'
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [{ type: 'required', template: messageTemplate.required }],
      advancedSettingsErrors: []
    }
  }
}
