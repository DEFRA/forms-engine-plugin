import { ComponentType, type MonthYearFieldComponent } from '@defra/forms-model'
import { format, isValid } from 'date-fns'
import {
  type Context,
  type CustomValidator,
  type LanguageMessages,
  type ObjectSchema
} from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import {
  type DateInputItem,
  type MonthYearState
} from '~/src/server/plugins/engine/components/types.js'
import { parseStrictDate } from '~/src/server/plugins/engine/date-helper.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { convertToLanguageMessages } from '~/src/server/utils/type-utils.js'

export class MonthYearField extends FormComponent {
  declare options: MonthYearFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>
  declare collection: ComponentCollection

  constructor(
    def: MonthYearFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { name, options } = def

    const isRequired = options.required !== false

    const customValidationMessages: LanguageMessages =
      convertToLanguageMessages({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        'any.required': messageTemplate.objectMissing,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
          title: 'Month',
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
          title: 'Year',
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

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return MonthYearField.isMonthYear(value) ? value : undefined
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    if (!value) {
      return ''
    }

    const date = new Date()
    date.setMonth(value.month - 1)

    const monthString = date.toLocaleString('default', { month: 'long' })
    return `${monthString} ${value.year}`
  }

  getContextValueFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

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

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { collection, name } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, label } = viewModel

    // Check for component errors only
    const hasError = errors?.some((error) => error.name === name)

    // Use the component collection to generate the subitems
    const items: DateInputItem[] = collection
      .getViewModel(payload, errors)
      .map(({ model }) => {
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

  isState(value?: FormStateValue | FormState) {
    return MonthYearField.isMonthYear(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return MonthYearField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
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
        { type: 'dateMin', template: messageTemplate.dateMin },
        { type: 'dateMax', template: messageTemplate.dateMax }
      ]
    }
  }

  static isMonthYear(
    value?: FormStateValue | FormState
  ): value is MonthYearState {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.month) &&
      NumberField.isNumber(value.year)
    )
  }
}

export function getValidatorMonthYear(component: MonthYearField) {
  const validator: CustomValidator = (payload: FormPayload, helpers) => {
    const { collection, name, options } = component

    const values = component.getFormValueFromState(
      component.getStateFromValidForm(payload)
    )

    const context: Context = {
      missing: collection.keys,
      key: name
    }

    if (!component.isState(values)) {
      return options.required !== false
        ? helpers.error('object.required', context)
        : payload
    }

    return payload
  }

  return validator
}
