import { ComponentType } from '@defra/forms-model'
import { format, isValid, parse } from 'date-fns'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import { parseStrictDate } from '~/src/server/plugins/engine/date-helper.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { formatDateForLanguage } from '~/src/server/plugins/payment/helper.js'

export class MonthYearField extends FormComponent {
  /** @type {MonthYearFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {ObjectSchema<FormPayload>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {ObjectSchema<FormState>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {ComponentCollection} */
  // @ts-expect-error TS2729: the base constructor has already set it
  collection = this.collection

  /**
   * @param {MonthYearFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { name, options } = def

    const isRequired = options.required !== false

    const customValidationMessages = /** @type {LanguageMessages} */ ({
      'any.required': messageTemplate.objectMissing,
      'number.base': messageTemplate.objectMissing,
      'number.precision': messageTemplate.dateFormat,
      'number.integer': messageTemplate.dateFormat,
      'number.unsafe': messageTemplate.dateFormat,
      'number.min': messageTemplate.dateFormat,
      'number.max': messageTemplate.dateFormat
    })

    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__month`,
          title: 'components.monthYearField.month',
          schema: { min: 1, max: 12, precision: 0 },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-2',
            customValidationMessages
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__year`,
          title: 'components.monthYearField.year',
          schema: { min: 1000, max: 3000, precision: 0 },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-4',
            customValidationMessages
          }
        }
      ],
      { ...props, parent: this },
      {
        custom: getValidatorMonthYear(this),
        peers: [`${name}__month`, `${name}__year`]
      }
    )

    this.options = options
    this.formSchema = this.collection.formSchema
    this.stateSchema = this.collection.stateSchema
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormValueFromState(state) {
    const value = super.getFormValueFromState(state)
    return MonthYearField.isMonthYear(value) ? value : undefined
  }

  /**
   * @param {MonthYearState | undefined} value
   * @param {Translator} [translator]
   * @returns {string}
   */
  getDisplayStringFromFormValue(
    value,
    translator = this.model.createTranslator()
  ) {
    if (!value) {
      return ''
    }

    const date = new Date()
    // Force to first day of month in case current date was say 31st and specified month has fewer than 31 days
    date.setDate(1)
    date.setMonth(value.month - 1)

    const monthString = formatDateForLanguage(date, 'LLLL', translator.language)
    return `${monthString} ${value.year}`
  }

  /**
   * @param {FormSubmissionState} state
   * @param {Translator} [translator]
   */
  getDisplayStringFromState(state, translator = this.model.createTranslator()) {
    const value = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(value, translator)
  }

  /**
   * @param {MonthYearState | undefined} value
   * @returns {string | null}
   */
  getContextValueFromFormValue(value) {
    if (
      !value ||
      !isValid(
        parseStrictDate(
          value,
          `${value.year}-${value.month}-01`,
          'yyyy-MM-dd',
          new Date()
        )
      )
    ) {
      return null
    }

    return format(`${value.year}-${value.month}-01`, 'yyyy-MM')
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { t } = translator
    const messages = /** @type {LanguageMessages} */ ({
      'any.required': buildValidationMessages(t).objectMissing,
      'number.base': buildValidationMessages(t).objectMissing,
      'number.precision': buildValidationMessages(t).dateFormat,
      'number.integer': buildValidationMessages(t).dateFormat,
      'number.unsafe': buildValidationMessages(t).dateFormat,
      'number.min': buildValidationMessages(t).dateFormat,
      'number.max': buildValidationMessages(t).dateFormat
    })
    return {
      [`${this.name}__month`]: messages,
      [`${this.name}__year`]: messages
    }
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { errors } = context

    const { collection, name } = this

    const viewModel = super.getViewModel(context)
    let { fieldset, label } = viewModel

    // Check for component errors only
    const hasError = errors?.some((error) => error.name === name)

    // Use the component collection to generate the subitems
    /** @type {DateInputItem[]} */
    const items = collection.getViewModel(context).map(({ model }) => {
      let { label, type, value, classes, errorMessage } = model

      if (label) {
        label.toString = () => label.text // Date component uses string labels
      }

      if (hasError || errorMessage) {
        classes = `${classes} govuk-input--error`.trim()
      }

      // Allow any `toString()`-able value so non-numeric
      // values are shown alongside their error messages
      if (!isFormValue(value)) {
        value = undefined
      }

      return {
        label,
        id: model.id,
        name: model.name,
        type,
        value,
        classes
      }
    })

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    return {
      ...viewModel,
      fieldset,
      items
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  isState(value) {
    return MonthYearField.isMonthYear(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return MonthYearField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        {
          type: 'dateFormatMonth',
          template: '{{#label}} must include a month'
        },
        { type: 'dateFormatYear', template: '{{#label}} must include a year' }
      ],
      advancedSettingsErrors: [
        { type: 'dateEarliest', template: messageTemplate.dateMin },
        { type: 'dateLatest', template: messageTemplate.dateMax }
      ]
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is MonthYearState}
   */
  static isMonthYear(value) {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.month) &&
      NumberField.isNumber(value.year)
    )
  }
}

/**
 * @param {MonthYearField} component
 */
export function getValidatorMonthYear(component) {
  /** @type {CustomValidator} */
  const validator = (/** @type {FormPayload} */ payload, helpers) => {
    const { collection, name, options } = component

    const values = component.getFormValueFromState(
      component.getStateFromValidForm(payload)
    )

    /** @type {Context} */
    const context = {
      missing: collection.keys,
      key: name
    }

    if (!component.isState(values)) {
      return options.required !== false
        ? helpers.error('object.required', context)
        : payload
    }

    const date = parse(
      `${values.year}-${values.month}-01`,
      'yyyy-MM-dd',
      new Date()
    )

    if (!isValid(date)) {
      return helpers.error('date.format', context)
    }

    // Minimum date from today
    const earliestDate = options.earliestMonthYear
      ? new Date(`${options.earliestMonthYear}-01`)
      : undefined

    if (earliestDate && date < earliestDate) {
      return helpers.error('date.min', { ...context, limit: earliestDate })
    }

    // Maximum date from today
    const latestDate = options.latestMonthYear
      ? new Date(`${options.latestMonthYear}-01`)
      : undefined

    if (latestDate && date > latestDate) {
      return helpers.error('date.max', { ...context, limit: latestDate })
    }

    return payload
  }

  return validator
}

/**
 * @import { MonthYearFieldComponent } from '@defra/forms-model'
 * @import { Context, CustomValidator, LanguageMessages, ObjectSchema } from 'joi'
 * @import { DateInputItem, MonthYearState, RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList, FormPayload, FormState, FormStateValue, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
