import { type MarkdownComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'
import { type FormQuery } from '~/src/server/routes/types.js'

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

  getViewModel(
    _payload?: FormPayload,
    _errors?: FormSubmissionError[],
    _query?: FormQuery,
    translator: Translator = this.model.createTranslator()
  ) {
    const { content, viewModel } = this

    const { tComponent } = translator

    return {
      ...viewModel,
      content: tComponent(this.def, 'content') || content,
      headerStartLevel: this.headerStartLevel
    }
  }
}
