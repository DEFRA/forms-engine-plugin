import {
  type HiddenFieldComponent,
  type TextFieldComponent
} from '@defra/forms-model'
import joi, { type StringSchema } from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormState,
  type FormStateValue,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class HiddenField extends FormComponent {
  declare formSchema: StringSchema
  declare stateSchema: StringSchema
  declare schema: TextFieldComponent['schema']
  declare options: TextFieldComponent['options']

  constructor(
    def: HiddenFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const formSchema = joi.string().trim().label(this.label).required()

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.schema = {}
    this.options = {}
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  isValue(value?: FormStateValue | FormState): value is string {
    return TextField.isText(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return TextField.getAllPossibleErrors()
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

  static isText(value?: FormStateValue | FormState): value is string {
    return isFormValue(value) && typeof value === 'string'
  }
}
