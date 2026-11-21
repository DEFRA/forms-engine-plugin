import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class ListFormComponent extends FormComponent {
  /** @type {Extract<SelectionComponentsDef, { options: object }>['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {ArraySchema<string[]> | ArraySchema<number[]> | BooleanSchema<string> | NumberSchema<string> | NumberSchema | StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {ArraySchema<string[]> | ArraySchema<number[]> | BooleanSchema<string> | NumberSchema<string> | NumberSchema | StringSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {List | undefined} */
  list

  /** @type {List['type']} */
  listType = 'string'

  /**
   * @returns {Item[]}
   */
  get items() {
    return this.list?.items ?? []
  }

  /**
   * @returns {Item['value'][]}
   */
  get values() {
    return this.items.map(({ value }) => value)
  }

  /**
   * @param {SelectionComponentsDef | (YesNoFieldComponent & Pick<ListComponentsDef, 'list'>)} def - Allow for Yes/No field custom list
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def
    const { model } = props

    if ('list' in def) {
      this.list = model.getList(def.list)
      this.listType = this.list?.type ?? 'string'
    }

    let formSchema = joi[this.listType]()
      .valid(...this.values)
      .label(this.label)
      .required()

    if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  /**
   * @param {FormSubmissionState} state
   * @returns {Item['value'] | Item['value'][] | undefined}
   */
  getFormValueFromState(state) {
    const { name, items } = this

    const value = state[name]

    // Allow for array values via subclass
    const values = this.isValue(value) ? [value].flat() : []
    const selected = items.filter((item) => values.includes(item.value))

    return selected.at(0)?.value
  }

  /**
   * @param {string | number | boolean | Item['value'][] | undefined} value
   * @param {Translator} [translator]
   * @returns {string}
   */
  getDisplayStringFromFormValue(
    value,
    translator = this.model.createTranslator()
  ) {
    const { items } = this

    const values = [value ?? []].flat()

    return items
      .filter((item) => values.includes(item.value))
      .map((item) => translator.tListItem(item, 'text') || item.text)
      .join(', ')
  }

  /**
   * @param {FormSubmissionState} state
   * @param {Translator} [translator]
   */
  getDisplayStringFromState(state, translator = this.model.createTranslator()) {
    // Allow for array values via subclass
    const value = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(value, translator)
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { translator = this.model.createTranslator() } = context

    const { items: listItems } = this

    const viewModel = super.getViewModel(context)
    const { value } = viewModel

    // Support multiple values for checkboxes
    const values = this.isValue(value) ? [value].flat() : []

    const { tListItem } = translator

    const items = listItems.map((item) => {
      const selected = values.includes(item.value)
      const resolvedText = tListItem(item, 'text') || item.text
      const resolvedHint = tListItem(item, 'hint') || item.hint?.text
      const hintAttr = resolvedHint ? { hint: { text: resolvedHint } } : {}
      /** @type {ListItem} */
      const itemModel = {
        ...item,
        text: resolvedText,
        selected,
        ...hintAttr
      }

      if ('id' in itemModel) {
        delete itemModel.id
      }

      if (item.description) {
        itemModel.hint = {
          text: item.description
        }
      }

      return itemModel
    })

    return {
      ...viewModel,
      items
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return ListFormComponent.getAllPossibleErrors()
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
 * @import { Item, List, ListComponentsDef, SelectionComponentsDef, YesNoFieldComponent } from '@defra/forms-model'
 * @import { ArraySchema, BooleanSchema, NumberSchema, StringSchema } from 'joi'
 * @import { ListItem, RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
