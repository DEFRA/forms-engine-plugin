import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class Markdown extends ComponentBase {
  /** @type {MarkdownComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {MarkdownComponent['content']} */
  content

  /** @type {number} */
  headerStartLevel

  /**
   * @param {MarkdownComponent} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
    this.headerStartLevel = 2
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { translator = this.model.createTranslator() } = context

    const { content, viewModel } = this

    const { tComponent } = translator

    return {
      ...viewModel,
      content: tComponent(this.def, 'content') || content,
      headerStartLevel: this.headerStartLevel
    }
  }
}

/**
 * @import { MarkdownComponent } from '@defra/forms-model'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 */
