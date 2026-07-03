import { type ComponentDef, type MarkdownComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type RenderContext } from '~/src/server/plugins/engine/components/types.js'

export class Markdown extends ComponentBase {
  declare options: MarkdownComponent['options']
  content: MarkdownComponent['content']
  headerStartLevel: number

  constructor(
    def: MarkdownComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
    this.headerStartLevel = 2
  }

  getViewModel(context: RenderContext) {
    const { content, viewModel } = this

    const { tComponent } = context.translator

    return {
      ...viewModel,
      content:
        tComponent(this as unknown as ComponentDef, 'content') || content,
      headerStartLevel: this.headerStartLevel
    }
  }
}
