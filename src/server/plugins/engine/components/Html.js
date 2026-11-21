import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class Html extends ComponentBase {
  /** @type {HtmlComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {HtmlComponent['content']} */
  content

  /**
   * @param {HtmlComponent} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
  }

  getViewModel() {
    const { content, viewModel } = this

    return {
      ...viewModel,
      content
    }
  }
}

/**
 * @import { HtmlComponent } from '@defra/forms-model'
 */
