import {
  type AutocompleteFieldComponent,
  type SelectFieldComponent
} from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'
import { type FormQuery } from '~/src/server/routes/types.js'

export class SelectField extends ListFormComponent {
  declare options:
    | SelectFieldComponent['options']
    | AutocompleteFieldComponent['options']

  constructor(
    def: SelectFieldComponent | AutocompleteFieldComponent,
    props: ConstructorParameters<typeof ListFormComponent>[1]
  ) {
    super(def, props)

    const { options } = def
    let { formSchema } = this

    if (options.required === false) {
      formSchema = formSchema.allow('')
    } else {
      formSchema = formSchema.empty('')
    }

    this.formSchema = formSchema
    this.options = options
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionError[],
    query: FormQuery = {},
    translator: Translator = this.model.createTranslator()
  ) {
    const viewModel = super.getViewModel(payload, errors, query, translator)
    let { items } = viewModel

    items = [{ value: '' }, ...items]

    return {
      ...viewModel,
      items
    }
  }
}
