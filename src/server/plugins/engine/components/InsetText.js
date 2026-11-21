import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class InsetText extends ComponentBase {
  /** @type {InsetTextComponent['content']} */
  content

  /**
   * @param {InsetTextComponent} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { content } = def

    this.content = content
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
 * @import { InsetTextComponent } from '@defra/forms-model'
 */
