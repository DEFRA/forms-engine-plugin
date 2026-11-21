import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers/index.js'
import {
  INVALID_ERROR_CODE,
  joi
} from '~/src/server/plugins/engine/components/helpers/telephone.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class TelephoneNumberField extends FormComponent {
  /** @type {TelephoneNumberFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /**
   * @param {TelephoneNumberFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
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
        [INVALID_ERROR_CODE]: message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    addClassOptionIfNone(options, 'govuk-input--width-20')

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const viewModel = super.getViewModel(context)
    const { attributes } = viewModel

    attributes.autocomplete = 'tel'

    return {
      ...viewModel,
      type: 'tel'
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return TelephoneNumberField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        { type: 'format', template: messageTemplate.format }
      ],
      advancedSettingsErrors: []
    }
  }
}

/**
 * @import { TelephoneNumberFieldComponent } from '@defra/forms-model'
 * @import { StringSchema } from 'joi'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'
 */
