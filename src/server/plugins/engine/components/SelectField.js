import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'

export class SelectField extends ListFormComponent {
  /** @type {SelectFieldComponent['options'] | AutocompleteFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @param {SelectFieldComponent | AutocompleteFieldComponent} def
   * @param {ConstructorParameters<typeof ListFormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def
    let { formSchema } = /** @type {ListFormComponent} */ (this)

    if (options.required === false) {
      formSchema = formSchema.allow('')
    } else {
      formSchema = formSchema.empty('')
    }

    this.formSchema = formSchema
    this.options = options
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const viewModel = super.getViewModel(context)
    let { items } = viewModel

    items = [{ value: '' }, ...items]

    return {
      ...viewModel,
      items
    }
  }
}

/**
 * @import { AutocompleteFieldComponent, SelectFieldComponent } from '@defra/forms-model'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 */
