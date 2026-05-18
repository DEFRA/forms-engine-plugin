import { type NotificationBannerComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { markdown } from '~/src/server/plugins/engine/components/markdownParser.js'

export class NotificationBanner extends ComponentBase {
  declare options: NotificationBannerComponent['options']
  content: NotificationBannerComponent['content']

  constructor(
    def: NotificationBannerComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
  }

  getViewModel() {
    const { content, title, viewModel } = this

    return {
      ...viewModel,
      titleHtml: title,
      html: markdown.parse(content, { async: false }).trim(),
      type: this.options.type
    }
  }
}
