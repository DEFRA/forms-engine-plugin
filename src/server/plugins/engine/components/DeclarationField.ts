import { type DeclarationFieldComponent, type Item } from '@defra/forms-model'
import joi, {
  type ArraySchema,
  type BooleanSchema,
  type StringSchema
} from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type FormValue
} from '~/src/server/plugins/engine/types.js'

export class DeclarationField extends FormComponent {
  private readonly DEFAULT_DECLARATION_LABEL = 'I understand and agree'

  declare options: DeclarationFieldComponent['options']

  declare declarationConfirmationLabel: string

  declare formSchema: ArraySchema<StringSchema[]>
  declare stateSchema: BooleanSchema
  declare content: string

  constructor(
    def: DeclarationFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options, content } = def

    let checkboxSchema = joi.string().valid('true')

    if (options.required !== false) {
      checkboxSchema = checkboxSchema.required()
    }

    const formSchema = joi
      .array()
      .items(checkboxSchema, joi.string().valid('unchecked').strip())
      .label(this.label)
      .single()
      .messages({
        'any.required': messageTemplate.declarationRequired as string,
        'any.unknown': messageTemplate.declarationRequired as string,
        'array.includesRequiredUnknowns':
          messageTemplate.declarationRequired as string
      }) as ArraySchema<StringSchema[]>

    this.formSchema = formSchema
    this.stateSchema = joi.boolean().cast('string').label(this.label).required()

    this.options = options
    this.content = content
    this.declarationConfirmationLabel =
      options.declarationConfirmationLabel ?? this.DEFAULT_DECLARATION_LABEL
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return state[name] === true ? 'true' : undefined
  }

  getFormDataFromState(state: FormSubmissionState): FormPayload {
    const { name } = this
    return { [name]: state[name] === true ? 'true' : undefined }
  }

  getStateFromValidForm(payload: FormPayload): FormState {
    const { name } = this
    const payloadValue = payload[name]
    const value =
      this.isValue(payloadValue) &&
      payloadValue.length > 0 &&
      payloadValue.every((v) => {
        return v === 'true'
      })

    return { [name]: value }
  }

  getContextValueFromFormValue(value: FormValue | FormPayload): boolean {
    return value === 'true'
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  getDisplayStringFromFormValue(value: FormValue | FormPayload): string {
    return value ? this.declarationConfirmationLabel : ''
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const defaultDeclarationConfirmationLabel =
      'I confirm that I understand and accept this declaration'
    const {
      title,
      hint,
      content,
      declarationConfirmationLabel = defaultDeclarationConfirmationLabel
    } = this
    return {
      ...super.getViewModel(payload, errors),
      hint: hint ? { text: hint } : undefined,
      fieldset: {
        legend: {
          text: title
        }
      },
      content,
      values: payload[this.name],
      items: [
        {
          text: declarationConfirmationLabel,
          value: 'true'
        }
      ]
    }
  }

  isValue(value?: FormStateValue | FormState): value is Item['value'][] {
    if (!Array.isArray(value)) {
      return false
    }

    // Skip checks when empty
    if (!value.length) {
      return true
    }

    return value.every(isFormValue)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return DeclarationField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.declarationRequired }
      ],
      advancedSettingsErrors: []
    }
  }

  static isBool(value?: FormStateValue | FormState): value is boolean {
    return isFormValue(value) && typeof value === 'boolean'
  }
}
