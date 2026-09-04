import {
  ComponentType,
  findExclusiveItem,
  getAdditionalQuestion,
  getAdditionalQuestionName,
  getExclusivePosition,
  type AdditionalQuestion,
  type CheckboxesFieldComponent,
  type Item
} from '@defra/forms-model'
import joi, {
  type ArraySchema,
  type JoiExpression,
  type LanguageMessages,
  type Schema
} from 'joi'

import { EN_GB } from '~/src/server/constants.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  isFormValue,
  type FormComponent
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import {
  type ComponentViewModel,
  type ListItem,
  type RenderContext
} from '~/src/server/plugins/engine/components/types.js'
import { t as tPlugin } from '~/src/server/plugins/engine/i18n/index.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  messageTemplate,
  opts as expressionOptions
} from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

/**
 * The checkboxes view model, plus the revealed question when the list has an
 * exclusive item that carries one.
 */
export type CheckboxesFieldViewModel = ReturnType<
  SelectionControlField['getViewModel']
> & {
  additionalQuestion?: ComponentViewModel
}

/**
 * An item may be marked as the "none of the above" style option for its list.
 * Selecting it alongside any other option is a validation error, and it may
 * reveal a single short answer question held under its own state key.
 * @see {@link https://design-system.service.gov.uk/components/checkboxes/#adding-an-none-option}
 */
export class CheckboxesField extends SelectionControlField {
  declare options: CheckboxesFieldComponent['options']
  declare schema: CheckboxesFieldComponent['schema']
  declare formSchema: ArraySchema<string> | ArraySchema<number>
  declare stateSchema: ArraySchema<string> | ArraySchema<number>
  declare limits: { min?: number; max?: number; length?: number }

  /** The item marked as the exclusive ("none of the above") option, if any */
  exclusiveItem?: Item

  /** The question revealed when the exclusive option is selected, if any */
  additionalQuestion?: AdditionalQuestion

  /** State key holding the additional question's answer, if any */
  additionalQuestionName?: string

  constructor(
    def: CheckboxesFieldComponent,
    props: ConstructorParameters<typeof SelectionControlField>[1]
  ) {
    super(def, props)

    const { listType: type } = this
    const { name, options, schema } = def

    let formSchema =
      type === 'string' ? joi.array<string>() : joi.array<number>()

    const itemsSchema = joi[type]()
      .valid(...this.values)
      .label(this.label)

    formSchema = formSchema
      .items(itemsSchema)
      .single()
      .label(this.label)
      .required()

    const limits: { min?: number; max?: number; length?: number } = {}

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    if (typeof schema?.length === 'number') {
      formSchema = formSchema.length(schema.length)
      limits.length = schema.length
    } else {
      if (typeof schema?.min === 'number') {
        formSchema = formSchema.min(schema.min)
        limits.min = schema.min
      }

      if (typeof schema?.max === 'number') {
        formSchema = formSchema.max(schema.max)
        limits.max = schema.max
      }
    }

    this.limits = limits

    // Lists written before extensions existed have no exclusive item, so
    // everything below is skipped and the field behaves exactly as before
    const exclusiveItem = findExclusiveItem(this.items)
    const additionalQuestion = getAdditionalQuestion(exclusiveItem)

    this.exclusiveItem = exclusiveItem
    this.additionalQuestion = additionalQuestion

    // The state schema is taken before the exclusive rule is added. Saved state
    // has already been through validation, and an older answer that predates
    // the exclusive option should not stop the form being loaded.
    this.stateSchema = formSchema
      .messages(CheckboxesField.buildErrorMessages(EN_GB, limits))
      .default(null)
      .allow(null)

    if (exclusiveItem) {
      formSchema = formSchema.custom((value: unknown, helpers) => {
        if (
          Array.isArray(value) &&
          value.length > 1 &&
          value.includes(exclusiveItem.value)
        ) {
          return helpers.error('array.exclusive')
        }

        return value
      })
    }

    formSchema = formSchema.messages(
      CheckboxesField.buildErrorMessages(EN_GB, limits, exclusiveItem?.text)
    )

    this.formSchema = formSchema.default([])
    this.options = options

    if (exclusiveItem && additionalQuestion) {
      const additionalQuestionName = getAdditionalQuestionName(
        name,
        additionalQuestion
      )

      this.additionalQuestionName = additionalQuestionName
      this.hasOwnStateKey = true

      this.collection = new ComponentCollection(
        [
          {
            type: ComponentType.TextField,
            id: additionalQuestion.id,
            name: additionalQuestionName,
            title: additionalQuestion.title,
            errorDescription:
              CheckboxesField.buildAdditionalQuestionErrorDescription(
                additionalQuestion.title
              ),
            hint: additionalQuestion.hint,
            schema: additionalQuestion.schema,
            options: {
              required: additionalQuestion.options?.required !== false,
              classes: 'govuk-!-width-two-thirds'
            }
          }
        ],
        { ...props, parent: this }
      )

      const [additionalQuestionField] = this.collection.fields

      // The answer is only asked for, and only kept, while the exclusive option
      // is selected. Anything else is stripped, which clears a previous answer
      // when the user goes back and unticks the option.
      this.collection.formSchema = this.collection.formSchema.keys({
        [additionalQuestionName]: joi.any().when(name, {
          is: CheckboxesField.exclusiveSelectedSchema(exclusiveItem),
          then: additionalQuestionField.formSchema as Schema,
          otherwise: joi.any().strip()
        })
      })
    }
  }

  /**
   * Error messages read "Enter {{lowerFirst(#label)}}", so a title written as a
   * question ("How did you hear about us?") would produce "Enter how did you
   * hear about us?". Trailing question marks and colons are removed so the
   * message reads as a sentence.
   */
  private static buildAdditionalQuestionErrorDescription(title: string) {
    return title.replace(/[?:]+\s*$/, '').trim()
  }

  /**
   * Matches the payload of the checkbox list when the exclusive option is among
   * the values. Single selections arrive unwrapped, so both shapes are allowed.
   */
  private static exclusiveSelectedSchema(exclusiveItem: Item) {
    return joi
      .alternatives()
      .try(
        joi.array().has(joi.any().valid(exclusiveItem.value)),
        joi.any().valid(exclusiveItem.value)
      )
      .required()
  }

  getFormDataFromState(state: FormSubmissionState): FormPayload {
    const { collection, name } = this

    return {
      ...collection?.getFormDataFromState(state),
      [name]: this.getFormValue(state[name])
    }
  }

  getStateFromValidForm(payload: FormPayload): FormState {
    const { collection, name } = this

    return {
      ...collection?.getStateFromValidForm(payload),
      [name]: this.getFormValue(payload[name]) ?? null
    }
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

  /**
   * Whether the exclusive option is among the answers held in state
   */
  isExclusiveSelected(state: FormSubmissionState) {
    const { exclusiveItem } = this

    if (!exclusiveItem) {
      return false
    }

    return !!this.getFormValueFromState(state)?.includes(exclusiveItem.value)
  }

  /**
   * The additional question only gets a check answers row and a submission
   * record when it was actually asked for.
   */
  getSummaryFields(state: FormSubmissionState): FormComponent[] {
    const { collection } = this

    if (!collection || !this.isExclusiveSelected(state)) {
      return [this]
    }

    return [this, ...collection.fields]
  }

  getDisplayStringFromFormValue(
    selected: (string | number | boolean)[] | undefined,
    translator: Translator
  ) {
    const { items } = this

    if (!selected) {
      return ''
    }

    return items
      .filter((item) => selected.includes(item.value))
      .map((item) => translator.tListItem(item, 'text') || item.text)
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

  getDisplayStringFromState(
    state: FormSubmissionState,
    translator: Translator
  ) {
    const selected = this.getFormValueFromState(state) ?? []
    return this.getDisplayStringFromFormValue(selected, translator)
  }

  getContextValueFromState(state: FormSubmissionState) {
    const values = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(values)
  }

  /**
   * The additional question is rendered as its own input and shows its own
   * error, so the error summary needs one entry per key rather than one for
   * the whole field.
   */
  getViewErrors(
    translator: Translator,
    errors?: FormSubmissionError[]
  ): FormSubmissionError[] | undefined {
    if (!this.collection) {
      return super.getViewErrors(translator, errors)
    }

    return this.getErrors(translator, errors)?.filter(
      (error, index, self) =>
        index === self.findIndex((err) => err.name === error.name)
    )
  }

  getViewModel(context: RenderContext): CheckboxesFieldViewModel {
    const { collection, exclusiveItem, name } = this

    const viewModel = super.getViewModel(context)

    if (!exclusiveItem) {
      return viewModel
    }

    const { t } = context.translator

    let additionalQuestion: ComponentViewModel | undefined

    if (collection) {
      additionalQuestion = collection.getViewModel(context).at(0)

      // The additional question shows its own error message, so keep the
      // checkbox group to errors raised against the checkboxes themselves
      const ownErrors = this.getErrors(
        context.translator,
        context.errors
      )?.filter((error) => error.name === name)

      viewModel.errors = ownErrors?.length ? ownErrors : undefined
      viewModel.errorMessage = ownErrors?.length
        ? { text: ownErrors[0].text }
        : undefined
    }

    const items: ListItem[] = viewModel.items.map((item: ListItem) => {
      const itemModel: ListItem = { ...item }

      // Definition-only data, not understood by the GOV.UK macro
      if ('extensions' in itemModel) {
        delete itemModel.extensions
      }

      if (item.value !== exclusiveItem.value) {
        return itemModel
      }

      // Unticks every other option when this one is ticked. Without
      // JavaScript the same rule is enforced by validation instead.
      itemModel.behaviour = 'exclusive'

      if (additionalQuestion) {
        itemModel.hasAdditionalQuestion = true
      }

      return itemModel
    })

    // The divider always sits between the exclusive option and the rest
    if (items.length > 1) {
      const divider: ListItem = { divider: t('common.or') }

      if (getExclusivePosition(this.items) === 'first') {
        items.splice(1, 0, divider)
      } else {
        items.splice(items.length - 1, 0, divider)
      }
    }

    return {
      ...viewModel,
      items,
      additionalQuestion
    }
  }

  getValidationMessagesOverride(
    translator: Translator
  ): Record<string, LanguageMessages> {
    const { exclusiveItem } = this
    const { language } = translator

    const exclusiveText = exclusiveItem
      ? translator.tListItem(exclusiveItem, 'text') || exclusiveItem.text
      : undefined

    return {
      [this.name]: CheckboxesField.buildErrorMessages(
        language,
        this.limits,
        exclusiveText
      )
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return CheckboxesField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    const parentErrors = SelectionControlField.getAllPossibleErrors()

    return {
      ...parentErrors,
      advancedSettingsErrors: [
        ...parentErrors.advancedSettingsErrors,
        { type: 'array.min', template: messageTemplate.arrayMin },
        { type: 'array.max', template: messageTemplate.arrayMax },
        { type: 'array.length', template: messageTemplate.arrayLength }
      ]
    }
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

  static buildErrorMessages(
    language: string,
    limits: { min?: number; max?: number; length?: number } = {},
    exclusiveText?: string
  ): LanguageMessages {
    const exclusive = (
      exclusiveText
        ? {
            'array.exclusive': joi.expression(
              tPlugin('validation.arrayExclusive', language, {
                exclusive: exclusiveText
              }),
              expressionOptions
            ) as JoiExpression
          }
        : {}
    ) as LanguageMessages

    return {
      'array.min': tPlugin('validation.arrayMin', language, {
        count: limits.min ?? 1
      }),
      'array.max': tPlugin('validation.arrayMax', language, {
        count: limits.max ?? 1
      }),
      'array.length': tPlugin('validation.arrayLength', language, {
        count: limits.length ?? 1
      }),
      ...exclusive
    }
  }
}
