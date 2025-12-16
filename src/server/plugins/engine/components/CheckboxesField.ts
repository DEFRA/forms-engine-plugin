import { type CheckboxesFieldComponent, type Item } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import { isFormValue } from '~/src/server/plugins/engine/components/FormComponent.js'
import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type FormState,
  type FormStateValue,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class CheckboxesField extends SelectionControlField {
  declare options: CheckboxesFieldComponent['options']
  declare formSchema: ArraySchema<string> | ArraySchema<number>
  declare stateSchema: ArraySchema<string> | ArraySchema<number>

  constructor(
    def: CheckboxesFieldComponent,
    props: ConstructorParameters<typeof SelectionControlField>[1]
  ) {
    super(def, props)

    const { listType: type } = this
    const { options } = def

    const baseSchema =
      type === 'string' ? joi.array<string>() : joi.array<number>()

    const itemsSchema = joi[type]()
      .valid(...this.values)
      .label(this.label)

    let formSchema = baseSchema
      .items(itemsSchema)
      .single()
      .label(this.label)
      .required()
      .default([])

    const stateSchema = baseSchema
      .items(itemsSchema)
      .label(this.label)
      .required()
      .default(null)
      .allow(null)

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    this.formSchema = formSchema
    this.stateSchema = stateSchema
    this.options = options
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { items, name } = this

    // State checkbox values
    const values = this.getFormValue(state[name]) ?? []

    // Map (or discard) state values to item values
    const selected = items
      .filter((item) => values.includes(item.value))
      .map((item) => item.value)

    return selected.length ? selected : undefined
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  getDisplayStringFromFormValue(selected: (string | number | boolean)[]) {
    const { items } = this

    // Map selected values to text
    return items
      .filter((item) => selected.includes(item.value))
      .map((item) => item.text)
      .join(', ')
  }

  getContextValueFromFormValue(
    values: (string | number | boolean)[] | undefined
  ): (string | number | boolean)[] {
    /**
     * For evaluation context purposes, optional {@link CheckboxesField}
     * with an undefined value (i.e. nothing selected) should default to [].
     * This way conditions are not evaluated against `undefined` which throws errors.
     * Currently these errors are caught and the evaluation returns default `false`.
     * @see {@link QuestionPageController.getNextPath} for `undefined` return value
     * @see {@link FormModel.makeCondition} for try/catch block with default `false`
     * For negative conditions this is a problem because E.g.
     * The condition: 'selectedchecks' does not contain 'someval'
     * should return true IF 'selectedchecks' is undefined, not throw and return false.
     */
    return values ?? []
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    // Selected checkbox values
    const selected = this.getFormValueFromState(state) ?? []

    // Map selected values to text
    return this.getDisplayStringFromFormValue(selected)
  }

  getContextValueFromState(state: FormSubmissionState) {
    const values = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(values)
  }

  isValue(value?: FormStateValue | FormState): value is Item['value'][] {
    if (!Array.isArray(value)) {
      return false
    }

    // Skip checks when empty
    if (!value.length) {
      return true
    }

    return value.every(isFormValue)
  }
}
