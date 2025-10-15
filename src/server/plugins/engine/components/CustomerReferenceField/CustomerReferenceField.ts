import { type FormComponentsDef } from '@defra/forms-model'
import joi, { type ObjectSchema } from 'joi'

import { getRoutes } from '~/src/server/plugins/engine/components/CustomerReferenceField/routes.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class CustomerReferenceField extends FormComponent {
  declare options: CustomerReferenceFieldComponent['options']

  declare schema: CustomerReferenceFieldComponent['schema']

  declare formSchema: ObjectSchema
  declare stateSchema: ObjectSchema

  constructor(
    def: CustomerReferenceFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options } = def
    const schema = 'schema' in def ? def.schema : {}

    this.formSchema = joi
      .object()
      .keys({
        reference: joi.string().required(),
        _id: joi.string().required()
      })
      .required()
    this.stateSchema = this.formSchema
    this.options = options
    this.schema = schema
  }

  isValue(value?: FormStateValue | FormState): value is CustomerReferenceState {
    return CustomerReferenceField.isCustomerReferenceField(value)
  }

  isState(value?: FormStateValue | FormState): value is FormState {
    return CustomerReferenceField.isCustomerReferenceField(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return CustomerReferenceField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [{ type: 'required', template: messageTemplate.required }],
      advancedSettingsErrors: [
        { type: 'min', template: messageTemplate.min },
        { type: 'max', template: messageTemplate.max }
      ]
    }
  }

  getDisplayStringFromFormValue(value?: FormStateValue | FormState): string {
    if (this.isValue(value)) {
      return value.reference
    }
    return ''
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.value = this.getDisplayStringFromFormValue(payload[this.name])

    return viewModel
  }

  static isCustomerReferenceField(
    value?: FormStateValue | FormState
  ): value is CustomerReferenceState {
    return (
      value !== null &&
      typeof value === 'object' &&
      '_id' in value &&
      'reference' in value
    )
  }

  static getRoutes() {
    return {
      routes: getRoutes(),
      entrypoint: '/customer-reference-field/confirm'
    }
  }
}

export interface CustomerReferenceFieldComponent extends FormComponentsDef {
  id?: string
  type: 'CustomerReferenceField'
  shortDescription?: string
  name: string
  title: string
  hint?: string
  options: object
  schema: object
}

interface CustomerReferenceState {
  _id: string
  reference: string
}
