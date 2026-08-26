import { ComponentType } from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import {
  type ListItem,
  type RenderContext
} from '~/src/server/plugins/engine/components/types.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { type ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'

/**
 * "Selection controls" are checkboxes and radios (and switches), as per Material UI nomenclature.
 */
export class SelectionControlField extends ListFormComponent {
  getViewModel(context: RenderContext) {
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
      const itemModel = { ...item, checked } satisfies ListItem

      if ('bold' in options && options.bold) {
        itemModel.label ??= {}
        itemModel.label.classes = 'govuk-label--s'
      }

      return itemModel
    })

    // PoC to force checkboxes/radios to include the 'none' option with conditional reveal
    // For testing out JS vs non-JS behaviour
    if (
      this.def.type === ComponentType.CheckboxesField ||
      this.def.type === ComponentType.RadiosField
    ) {
      items.push(
        {
          divider: 'or'
        },
        {
          value: 'none',
          text: 'No, I will not be travelling to any of these countries',
          behaviour: 'exclusive',
          conditional: {
            // Add state and error content
            html: `<div class="govuk-form-group">
                    <h1 class="govuk-label-wrapper">
                      <label class="govuk-label govuk-label--s" for="event-name">
                        Please specify
                      </label>
                    </h1>
                    <input class="govuk-input" id="event-name" name="eventName" type="text">
                  </div>`
          }
        }
      )
    }

    return {
      ...viewModel,
      fieldset,
      items
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return SelectionControlField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'selectRequired', template: messageTemplate.selectRequired }
      ],
      advancedSettingsErrors: []
    }
  }
}
