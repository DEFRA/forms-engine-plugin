import { SchemaVersion, yesNoListId, yesNoListName } from '@defra/forms-model'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import {
  addClassOptionIfNone,
  withCustomValidationOverrides
} from '~/src/server/plugins/engine/components/helpers/index.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

/**
 * @description
 * YesNoField is a radiosField with predefined values.
 */
export class YesNoField extends SelectionControlField {
  /** @type {YesNoFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @param {YesNoFieldComponent} def
   * @param {ConstructorParameters<typeof SelectionControlField>[1]} props
   */
  constructor(def, props) {
    super(
      {
        ...def,
        list:
          props.model.schemaVersion === SchemaVersion.V1
            ? yesNoListName
            : yesNoListId
      },
      props
    )

    const { options } = def
    let { formSchema } = /** @type {SelectionControlField} */ (this)

    addClassOptionIfNone(options, 'govuk-radios--inline')

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    } else {
      formSchema = formSchema.messages({
        'any.required': messageTemplate.selectYesNoRequired
      })
    }

    this.formSchema = formSchema
    this.options = options
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { customValidationMessage, customValidationMessages } = this.options
    const { selectYesNoRequired } = buildValidationMessages(translator.t)
    const defaults = {
      'any.required': selectYesNoRequired
    }

    return {
      [this.name]: withCustomValidationOverrides(
        defaults,
        customValidationMessage,
        customValidationMessages
      )
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return YesNoField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        {
          type: 'selectYesNoRequired',
          template: messageTemplate.selectYesNoRequired
        }
      ],
      advancedSettingsErrors: []
    }
  }
}

/**
 * @import { YesNoFieldComponent } from '@defra/forms-model'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'
 */
