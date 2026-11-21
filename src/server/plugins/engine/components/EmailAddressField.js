import { preventUnicodeInEmail } from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class EmailAddressField extends FormComponent {
  /** @type {EmailAddressFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @param {EmailAddressFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def

    let formSchema = joi
      .string()
      .trim()
      .email()
      .custom((value, /** @type {CustomHelpers<string>} */ helpers) =>
        preventUnicodeInEmail(value, helpers)
      )
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
        'string.email': message,
        'string.unicode': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = /** @type {ComponentSchema} */ (formSchema.default(''))
    this.stateSchema = /** @type {ComponentSchema} */ (
      formSchema.default(null).allow(null)
    )
    this.options = options
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const viewModel = super.getViewModel(context)
    const { attributes } = viewModel

    attributes.autocomplete = 'email'

    return {
      ...viewModel,
      type: 'email'
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return EmailAddressField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        { type: 'format', template: messageTemplate.format },
        { type: 'unicode', template: messageTemplate.unicode }
      ],
      advancedSettingsErrors: []
    }
  }
}

/**
 * @import { EmailAddressFieldComponent } from '@defra/forms-model'
 * @import { CustomHelpers } from 'joi'
 * @import { ComponentSchema } from '~/src/server/plugins/engine/components/ComponentBase.js'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'
 */
