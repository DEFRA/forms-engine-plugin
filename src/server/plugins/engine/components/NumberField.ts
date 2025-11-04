import { type NumberFieldComponent } from '@defra/forms-model'
import joi, {
  type CustomHelpers,
  type CustomValidator,
  type NumberSchema
} from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class NumberField extends FormComponent {
  declare options: NumberFieldComponent['options']
  declare schema: NumberFieldComponent['schema']
  declare formSchema: NumberSchema
  declare stateSchema: NumberSchema

  constructor(
    def: NumberFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options, schema } = def

    let formSchema = joi
      .number()
      .custom(getValidatorPrecision(this))
      .label(this.label)
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    } else {
      const messages = options.customValidationMessages

      formSchema = formSchema.empty('').messages({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        'any.required':
          messages?.['any.required'] ?? (messageTemplate.required as string)
      })
    }

    if (typeof schema.min === 'number') {
      formSchema = formSchema.min(schema.min)
    }

    if (typeof schema.max === 'number') {
      formSchema = formSchema.max(schema.max)
    }

    if (typeof schema.precision === 'number' && schema.precision <= 0) {
      formSchema = formSchema.integer()
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'number.base': message,
        'number.precision': message,
        'number.integer': message,
        'number.min': message,
        'number.max': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { options, schema } = this

    const viewModel = super.getViewModel(payload, errors)
    let { attributes, prefix, suffix, value } = viewModel

    if (typeof schema.precision === 'undefined' || schema.precision <= 0) {
      // If precision isn't provided or provided and
      // less than or equal to 0, use numeric inputmode
      attributes.inputmode = 'numeric'
    }

    if (options.prefix) {
      prefix = {
        text: options.prefix
      }
    }

    if (options.suffix) {
      suffix = {
        text: options.suffix
      }
    }

    // Allow any `toString()`-able value so non-numeric
    // values are shown alongside their error messages
    if (!isFormValue(value)) {
      value = undefined
    }

    return {
      ...viewModel,
      attributes,
      prefix,
      suffix,
      value
    }
  }

  isValue(value?: FormStateValue | FormState) {
    return NumberField.isNumber(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return NumberField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        { type: 'numberInteger', template: messageTemplate.numberInteger }
      ],
      advancedSettingsErrors: [
        { type: 'numberMin', template: messageTemplate.numberMin },
        { type: 'numberMax', template: messageTemplate.numberMax },
        { type: 'numberPrecision', template: messageTemplate.numberPrecision }
      ]
    }
  }

  static isNumber(value?: FormStateValue | FormState): value is number {
    return typeof value === 'number'
  }
}

/**
 * Validates string length of a numeric value
 * @param value - The numeric value to validate
 * @param minLength - Minimum required string length
 * @param maxLength - Maximum allowed string length
 * @returns Object with validation result
 */
export function validateStringLength(
  value: number,
  minLength?: number,
  maxLength?: number
): { isValid: boolean; error?: 'minLength' | 'maxLength' } {
  if (typeof minLength !== 'number' && typeof maxLength !== 'number') {
    return { isValid: true }
  }

  const valueStr = String(value)

  if (typeof minLength === 'number' && valueStr.length < minLength) {
    return { isValid: false, error: 'minLength' }
  }

  if (typeof maxLength === 'number' && valueStr.length > maxLength) {
    return { isValid: false, error: 'maxLength' }
  }

  return { isValid: true }
}

/**
 * Validates minimum decimal precision
 * @param value - The numeric value to validate
 * @param minPrecision - Minimum required decimal places
 * @returns true if valid, false if invalid
 */
export function validateMinimumPrecision(
  value: number,
  minPrecision: number
): boolean {
  if (Number.isInteger(value)) {
    return false
  }

  const valueStr = String(value)
  const decimalIndex = valueStr.indexOf('.')

  if (decimalIndex !== -1) {
    const decimalPlaces = valueStr.length - decimalIndex - 1
    return decimalPlaces >= minPrecision
  }

  return false
}

/**
 * Helper function to handle length validation errors
 * Returns the appropriate error response based on the validation result
 */
function handleLengthValidationError(
  lengthCheck: ReturnType<typeof validateStringLength>,
  helpers: CustomHelpers,
  custom: string | undefined,
  minLength: number | undefined,
  maxLength: number | undefined
) {
  if (!lengthCheck.isValid && lengthCheck.error) {
    const errorType = `number.${lengthCheck.error}`

    if (custom) {
      // Only pass the relevant length value in context
      const contextData =
        lengthCheck.error === 'minLength'
          ? { minLength: minLength ?? 0 }
          : { maxLength: maxLength ?? 0 }
      return helpers.message({ custom }, contextData)
    }

    const context =
      lengthCheck.error === 'minLength'
        ? { minLength: minLength ?? 0 }
        : { maxLength: maxLength ?? 0 }
    return helpers.error(errorType, context)
  }
  return null
}

export function getValidatorPrecision(component: NumberField) {
  const validator: CustomValidator = (value: number, helpers) => {
    const { options, schema } = component
    const { customValidationMessage: custom } = options
    const {
      precision: limit,
      minPrecision,
      minLength,
      maxLength
    } = schema as {
      precision?: number
      minPrecision?: number
      minLength?: number
      maxLength?: number
    }

    if (!limit || limit <= 0) {
      const lengthCheck = validateStringLength(value, minLength, maxLength)
      const error = handleLengthValidationError(
        lengthCheck,
        helpers,
        custom,
        minLength,
        maxLength
      )
      if (error) return error
      return value
    }

    // Validate precision (max decimal places)
    const validationSchema = joi
      .number()
      .precision(limit)
      .prefs({ convert: false })

    try {
      joi.attempt(value, validationSchema)
    } catch {
      return custom
        ? helpers.message({ custom }, { limit })
        : helpers.error('number.precision', { limit })
    }

    // Validate minimum precision (min decimal places)
    if (typeof minPrecision === 'number' && minPrecision > 0) {
      if (!validateMinimumPrecision(value, minPrecision)) {
        return helpers.error('number.minPrecision', { minPrecision })
      }
    }

    // Check string length validation after precision checks
    const lengthCheck = validateStringLength(value, minLength, maxLength)
    const error = handleLengthValidationError(
      lengthCheck,
      helpers,
      custom,
      minLength,
      maxLength
    )
    if (error) return error

    return value
  }

  return validator
}
