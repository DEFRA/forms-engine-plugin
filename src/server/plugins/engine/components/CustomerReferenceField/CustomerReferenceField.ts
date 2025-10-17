import { ComponentType, type FormComponentsDef } from '@defra/forms-model'
import joi, { type ObjectSchema } from 'joi'

import { ComponentCollection } from '../ComponentCollection.js'
import { TextField } from '../TextField.js'

import { getRoutes } from '~/src/server/plugins/engine/components/CustomerReferenceField/routes.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
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

    // const { options } = def
    // const schema = 'schema' in def ? def.schema : {}

    // this.formSchema = joi
    //   .object()
    //   .keys({
    //     reference: joi.string().required(),
    //     _id: joi.string().required()
    //   })
    //   .required()
    // // this.stateSchema = this.formSchema
    // this.options = options
    // this.schema = schema
    const { name } = def
    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.TextField,
          name: `${name}__reference`,
          title: 'Reference',
          schema: {},
          options: {}
        },
        {
          type: ComponentType.TextField,
          name: `${name}___id`,
          title: 'ID',
          schema: {},
          options: {}
        }
      ],
      { ...props, parent: this }
    )
    this.formSchema = this.collection.formSchema
    this.stateSchema = this.collection.stateSchema
  }

  // isValue(value?: FormStateValue | FormState): value is CustomerReferenceState {
  //   return CustomerReferenceField.isCustomerReferenceField(value)
  // }

  isState(value?: FormStateValue | FormState): value is FormState {
    return CustomerReferenceField.isCustomerReferenceField(value)
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return this.isState(value) ? value : undefined
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
    if (!value) {
      return ''
    }

    return value[`${this.name}__reference`] // todo value.reference similarly to UkAddressField value.addessline1
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.value = this.getDisplayStringFromFormValue(payload)

    return viewModel
  }

  static isCustomerReferenceField(
    value?: FormStateValue | FormState
  ): value is CustomerReferenceState {
    return (
      isFormState(value) &&
      TextField.isText(value.reference) &&
      TextField.isText(value._id)
    )
  }

  static getRoutes() {
    return {
      routes: getRoutes(),
      entrypoint: '/customer-reference-field/confirm'
    }
  }
}

// TODO move this to model

interface CustomerReferenceState extends Record<string, string> {
  _id: string
  reference: string
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
