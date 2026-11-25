import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class Details extends ComponentBase {
  /** @type {DetailsComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {DetailsComponent['content']} */
  content

  /**
   * @param {DetailsComponent} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
  }

  getViewModel() {
    const { content, title, viewModel } = this

    return {
      ...viewModel,
      html: content,
      summaryHtml: title
    }
  }
}

/**
 * @import { DetailsComponent } from '@defra/forms-model'
 */
