import { type AutocompleteFieldComponent } from '@defra/forms-model'
import { type LanguageMessages } from 'joi'

import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { type RenderContext } from '~/src/server/plugins/engine/components/types.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { type Translator } from '~/src/server/plugins/engine/types/index.js'

export class AutocompleteField extends SelectField {
  declare options: AutocompleteFieldComponent['options']

  constructor(
    def: AutocompleteFieldComponent,
    props: ConstructorParameters<typeof SelectField>[1]
  ) {
    super(def, props)

    const { options } = def
    let { formSchema } = this

    if (options.required !== false) {
      const messages = options.customValidationMessages

      formSchema = formSchema.messages({
        'any.only':
          messages?.['any.only'] ?? (messageTemplate.required as string),
        'any.required':
          messages?.['any.required'] ?? (messageTemplate.required as string)
      })
    }

    this.options = options
    this.formSchema = formSchema
  }

  getViewModel(context: RenderContext) {
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

  getValidationMessagesOverride(translator: Translator) {
    const { t } = translator
    return {
      [this.name]: {
        'any.required': buildValidationMessages(t).objectRequired,
        'any.only': buildValidationMessages(t).objectRequired
      } as LanguageMessages
    }
  }
}
