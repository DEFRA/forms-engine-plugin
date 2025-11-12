import { type MarkdownComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class Markdown extends ComponentBase {
  declare options: MarkdownComponent['options']
  content: MarkdownComponent['content']
  numOfComponents: number

  constructor(
    def: MarkdownComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
    this.numOfComponents = props.page?.collection.components.length ?? 0
  }

  getViewModel() {
    const { content, viewModel } = this

    return {
      ...viewModel,
      content,
      numOfComponents: this.numOfComponents
    }
  }
}
