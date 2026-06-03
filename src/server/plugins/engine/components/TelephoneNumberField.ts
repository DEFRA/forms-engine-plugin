import { type TelephoneNumberFieldComponent } from '@defra/forms-model'
import { type StringSchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers/index.js'
import {
  INTERNATIONAL_ERROR_CODE,
  INVALID_ERROR_CODE,
  UK_ERROR_CODE,
  joi
} from '~/src/server/plugins/engine/components/helpers/telephone.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class TelephoneNumberField extends FormComponent {
  declare options: TelephoneNumberFieldComponent['options']
  declare formSchema: StringSchema
  declare stateSchema: StringSchema

  constructor(
    def: TelephoneNumberFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options } = def
    const { format } = options

    let formSchema = joi
      .string()
      .trim()
      .phoneNumber({ format })
      .label(this.label)
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.pattern.base': message,
        [INVALID_ERROR_CODE]: message,
        [UK_ERROR_CODE]: message,
        [INTERNATIONAL_ERROR_CODE]: message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    addClassOptionIfNone(options, 'govuk-input--width-20')

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)
    const { attributes } = viewModel

    attributes.autocomplete = 'tel'

    return {
      ...viewModel,
      type: 'tel'
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return TelephoneNumberField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        { type: 'format', template: messageTemplate.format }
      ],
      advancedSettingsErrors: []
    }
  }
}
