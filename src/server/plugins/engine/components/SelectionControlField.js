import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

/**
 * "Selection controls" are checkboxes and radios (and switches), as per Material UI nomenclature.
 */
export class SelectionControlField extends ListFormComponent {
  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { options } = this

    const viewModel = super.getViewModel(context)
    let { fieldset, items, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    items = items.map((item) => {
      const { selected: checked } = item
      const itemModel = /** @satisfies {ListItem} */ ({ ...item, checked })

      if ('bold' in options && options.bold) {
        itemModel.label ??= {}
        itemModel.label.classes = 'govuk-label--s'
      }

      return itemModel
    })

    return {
      ...viewModel,
      fieldset,
      items
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return SelectionControlField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'selectRequired', template: messageTemplate.selectRequired }
      ],
      advancedSettingsErrors: []
    }
  }
}

/**
 * @import { ListItem, RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'
 */
