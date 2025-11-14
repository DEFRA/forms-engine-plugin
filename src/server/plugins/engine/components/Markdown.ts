import { hasFormComponents, type MarkdownComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

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
    const numOfQuestionsOnPage = hasFormComponents(props.page?.pageDef)
      ? props.page.pageDef.components.length
      : 0
    this.headerStartLevel = numOfQuestionsOnPage < 2 ? 1 : 2
  }

  getViewModel() {
    const { content, viewModel } = this

    return {
      ...viewModel,
      content,
      headerStartLevel: this.headerStartLevel
    }
  }
}
