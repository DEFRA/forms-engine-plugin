import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'

export class RadiosField extends SelectionControlField {
  /** @type {RadiosFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @param {RadiosFieldComponent} def
   * @param {ConstructorParameters<typeof SelectionControlField>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def
    let { formSchema } = /** @type {SelectionControlField} */ (this)

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    this.formSchema = formSchema
    this.options = options
  }
}

/**
 * @import { RadiosFieldComponent } from '@defra/forms-model'
 */
