import { type FormComponentsDef } from '@defra/forms-model'
import joi, {
  type JoiExpression,
  type LanguageMessages,
  type StringSchema
} from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers/index.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { convertToLanguageMessages } from '~/src/server/utils/type-utils.js'

interface LocationFieldOptions {
  instructionText?: string
  required?: boolean
  customValidationMessage?: string
  customValidationMessages?: LanguageMessages
  classes?: string
}

interface ValidationConfig {
  pattern: RegExp
  patternErrorMessage: JoiExpression
  requiredMessage: JoiExpression
}

/**
 * Abstract base class for location-based field components
 */
export abstract class LocationFieldBase extends FormComponent {
  declare options: LocationFieldOptions
  declare formSchema: StringSchema
  declare stateSchema: StringSchema
  instructionText?: string

  protected abstract getValidationConfig(): ValidationConfig
  protected abstract getErrorTemplates(): {
    type: string
    template: JoiExpression
  }[]

  constructor(
    def: FormComponentsDef,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options } = def
    const locationOptions = options as LocationFieldOptions
    this.instructionText = locationOptions.instructionText

    addClassOptionIfNone(locationOptions, 'govuk-input--width-10')

    const config = this.getValidationConfig()
    const messages = convertToLanguageMessages({
      'any.required': config.requiredMessage,
      'string.empty': config.requiredMessage,
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

      const messages = messageKeys.reduce<LanguageMessages>((acc, key) => {
        acc[key] = message
        return acc
      }, {})

      formSchema = formSchema.messages(messages)
    } else if (locationOptions.customValidationMessages) {
      formSchema = formSchema.messages(locationOptions.customValidationMessages)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = locationOptions
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  isValue(value?: FormStateValue | FormState): value is string {
    return LocationFieldBase.isText(value)
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)

    if (this.instructionText) {
      return {
        ...viewModel,
        instructionText: this.instructionText
      }
    }

    return viewModel
  }

  getAllPossibleErrors(): ErrorMessageTemplateList {
    const config = this.getValidationConfig()

    return {
      baseErrors: [
        {
          type: 'required',
          template:
            config.requiredMessage ?? (messageTemplate.required as string)
        },
        ...this.getErrorTemplates()
      ],
      advancedSettingsErrors: []
    }
  }

  static isText(value?: FormStateValue | FormState): value is string {
    return isFormValue(value) && typeof value === 'string'
  }
}
