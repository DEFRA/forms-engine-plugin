import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class List extends ComponentBase {
  /** @type {ListComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {ListComponent['hint']} */
  hint

  /** @type {ListType | undefined} */
  list

  /**
   * @returns {Item[]}
   */
  get items() {
    return this.list?.items ?? []
  }

  /**
   * @param {ListComponent} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { hint, list, options } = def
    const { model } = props

    this.hint = hint
    this.list = model.getList(list)
    this.options = options
  }

  getViewModel() {
    const { items: listItems, options, viewModel } = this

    let { classes, content, items, type } = viewModel

    if (options.type) {
      type = options.type
    }

    if (options.bold) {
      classes ??= ''
      classes = `${classes} govuk-!-font-weight-bold`.trim()
    }

    content = {
      title: !options.hideTitle ? this.title : undefined,
      text: this.hint ?? ''
    }

    items = listItems.map((item) => {
      /** @type {ListItem} */
      const itemModel = { ...item }

      if (item.description) {
        itemModel.hint = {
          text: item.description
        }
      }

      return itemModel
    })

    return {
      ...viewModel,
      type,
      classes,
      content,
      items
    }
  }
}

/**
 * @import { Item, List as ListType, ListComponent } from '@defra/forms-model'
 * @import { ListItem } from '~/src/server/plugins/engine/components/types.js'
 */
