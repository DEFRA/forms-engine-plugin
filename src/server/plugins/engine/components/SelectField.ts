import {
  type AutocompleteFieldComponent,
  type SelectFieldComponent
} from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type RenderContext } from '~/src/server/plugins/engine/components/types.js'

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

  getViewModel(context: RenderContext) {
    const viewModel = super.getViewModel(context)
    let { items } = viewModel

    items = [{ value: '' }, ...items]

    return {
      ...viewModel,
      items
    }
  }
}
