import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { withCustomValidationOverrides } from '~/src/server/plugins/engine/components/helpers/index.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class AutocompleteField extends SelectField {
  /** @type {AutocompleteFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @param {AutocompleteFieldComponent} def
   * @param {ConstructorParameters<typeof SelectField>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def
    let { formSchema } = /** @type {SelectField} */ (this)

    if (options.required !== false) {
      const messages = options.customValidationMessages

      formSchema = formSchema.messages({
        'any.only':
          messages?.['any.only'] ??
          /** @type {string} */ (messageTemplate.required),
        'any.required':
          messages?.['any.required'] ??
          /** @type {string} */ (messageTemplate.required)
      })
    }

    this.options = options
    this.formSchema = formSchema
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const viewModel = super.getViewModel(context)
    let { formGroup } = viewModel

    formGroup ??= {}
    formGroup.attributes = {
      'data-module': 'govuk-accessible-autocomplete'
    }

    return {
      ...viewModel,
      formGroup
    }
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { customValidationMessages, required } = this.options

    // An optional field keeps the global messages, as the constructor does
    if (required === false) {
      return null
    }

    const { t } = translator
    const defaults = {
      'any.required': buildValidationMessages(t).required,
      'any.only': buildValidationMessages(t).required
    }

    return {
      [this.name]: withCustomValidationOverrides(
        defaults,
        undefined,
        customValidationMessages
      )
    }
  }
}

/**
 * @import { AutocompleteFieldComponent } from '@defra/forms-model'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/types/index.js'
 */
