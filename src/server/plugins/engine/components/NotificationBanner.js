import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class NotificationBanner extends ComponentBase {
  /** @type {NotificationBannerComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {NotificationBannerComponent['content']} */
  content

  /**
   * @param {NotificationBannerComponent} def
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
      titleHtml: title,
      content,
      heading: this.options.heading,
      type: this.options.type
    }
  }
}

/**
 * @import { NotificationBannerComponent } from '@defra/forms-model'
 */
