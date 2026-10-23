import { type AutocompleteFieldComponent } from '@defra/forms-model'

import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { withCustomValidationOverrides } from '~/src/server/plugins/engine/components/helpers/index.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { type Translator } from '~/src/server/plugins/engine/types/index.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'
import { type FormQuery } from '~/src/server/routes/types.js'

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

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionError[],
    query: FormQuery = {},
    translator: Translator = this.model.createTranslator()
  ) {
    const viewModel = super.getViewModel(payload, errors, query, translator)
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
    const { customValidationMessages } = this.options
    const { t } = translator
    const defaults = {
      'any.required': buildValidationMessages(t).objectRequired,
      'any.only': buildValidationMessages(t).objectRequired
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
