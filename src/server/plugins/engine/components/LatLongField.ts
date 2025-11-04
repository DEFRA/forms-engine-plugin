import { ComponentType, type LatLongFieldComponent } from '@defra/forms-model'
import { type LanguageMessages, type ObjectSchema } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  createLocationFieldValidator,
  getLocationFieldViewModel
} from '~/src/server/plugins/engine/components/LocationFieldHelpers.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import { type LatLongState } from '~/src/server/plugins/engine/components/types.js'
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

// Precision constants
// UK latitude/longitude requires high precision for accurate location (within ~11mm)
const DECIMAL_PRECISION = 7 // 7 decimal places
const MIN_DECIMAL_PLACES = 1 // At least 1 decimal place required

// Latitude length constraints
// Min: 3 chars for values like "52.1" (2 digits + decimal + 1 decimal place)
// Max: 10 chars for values like "59.1234567" (2 digits + decimal + 7 decimal places)
const LATITUDE_MIN_LENGTH = 3
const LATITUDE_MAX_LENGTH = 10

// Longitude length constraints
// Min: 2 chars for values like "-1" or single digit with decimal (needs min decimal places)
// Max: 10 chars for values like "-1.1234567" (minus + 1 digit + decimal + 7 decimal places)
const LONGITUDE_MIN_LENGTH = 2
const LONGITUDE_MAX_LENGTH = 10

export class LatLongField extends FormComponent {
  declare options: LatLongFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>
  declare collection: ComponentCollection

  constructor(
    def: LatLongFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { name, options, schema } = def

    const isRequired = options.required !== false

    // Read schema values from def.schema with fallback defaults
    const latitudeMin = schema?.latitude?.min ?? 49
    const latitudeMax = schema?.latitude?.max ?? 60
    const longitudeMin = schema?.longitude?.min ?? -9
    const longitudeMax = schema?.longitude?.max ?? 2

    const customValidationMessages: LanguageMessages =
      convertToLanguageMessages({
        'any.required': messageTemplate.objectMissing,
        'number.base': messageTemplate.objectMissing,
        'number.precision':
          '{{#label}} must have no more than 7 decimal places',
        'number.minPrecision':
          '{{#label}} must have at least {{#minPrecision}} decimal place',
        'number.unsafe': '{{#label}} must be a valid number'
      })

    const latitudeMessages: LanguageMessages = convertToLanguageMessages({
      ...customValidationMessages,
      'number.base': `Enter a valid latitude for ${this.title} like 51.519450`,
      'number.min': `Latitude for ${this.title} must be between ${latitudeMin} and ${latitudeMax}`,
      'number.max': `Latitude for ${this.title} must be between ${latitudeMin} and ${latitudeMax}`,
      'number.minLength': `Latitude for ${this.title} must be between 3 and 10 characters`,
      'number.maxLength': `Latitude for ${this.title} must be between 3 and 10 characters`
    })

    const longitudeMessages: LanguageMessages = convertToLanguageMessages({
      ...customValidationMessages,
      'number.base': `Enter a valid longitude for ${this.title} like -0.127758`,
      'number.min': `Longitude for ${this.title} must be between ${longitudeMin} and ${longitudeMax}`,
      'number.max': `Longitude for ${this.title} must be between ${longitudeMin} and ${longitudeMax}`,
      'number.minLength': `Longitude for ${this.title} must be between 2 and 10 characters`,
      'number.maxLength': `Longitude for ${this.title} must be between 2 and 10 characters`
    })

    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__latitude`,
          title: 'Latitude',
          schema: {
            min: latitudeMin,
            max: latitudeMax,
            precision: DECIMAL_PRECISION,
            minPrecision: MIN_DECIMAL_PLACES,
            minLength: LATITUDE_MIN_LENGTH,
            maxLength: LATITUDE_MAX_LENGTH
          },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-10',
            suffix: '°',
            customValidationMessages: latitudeMessages
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__longitude`,
          title: 'Longitude',
          schema: {
            min: longitudeMin,
            max: longitudeMax,
            precision: DECIMAL_PRECISION,
            minPrecision: MIN_DECIMAL_PLACES,
            minLength: LONGITUDE_MIN_LENGTH,
            maxLength: LONGITUDE_MAX_LENGTH
          },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-10',
            suffix: '°',
            customValidationMessages: longitudeMessages
          }
        }
      ],
      { ...props, parent: this },
      {
        custom: getValidatorLatLong(this),
        peers: [`${name}__latitude`, `${name}__longitude`]
      }
    )

    this.options = options
    this.formSchema = this.collection.formSchema
    this.stateSchema = this.collection.stateSchema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return LatLongField.isLatLong(value) ? value : undefined
  }

  getDisplayStringFromFormValue(value: LatLongState | undefined): string {
    if (!value) {
      return ''
    }

    // CYA page format: <<latvalue, langvalue>>
    return `${value.latitude}, ${value.longitude}`
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(value)
  }

  getContextValueFromFormValue(value: LatLongState | undefined): string | null {
    if (!value) {
      return null
    }

    // Output format: Lat: <<entry>>\nLong: <<entry>>
    return `Lat: ${value.latitude}\nLong: ${value.longitude}`
  }

  getContextValueFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)
    return getLocationFieldViewModel(this, viewModel, payload, errors)
  }

  isState(value?: FormStateValue | FormState) {
    return LatLongField.isLatLong(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return LatLongField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        {
          type: 'latitudeFormat',
          template:
            'Enter a valid latitude for [short description] like 51.519450'
        },
        {
          type: 'longitudeFormat',
          template:
            'Enter a valid longitude for [short description] like -0.127758'
        }
      ],
      advancedSettingsErrors: [
        {
          type: 'latitudeMin',
          template: 'Latitude for [short description] must be between 49 and 60'
        },
        {
          type: 'latitudeMax',
          template: 'Latitude for [short description] must be between 49 and 60'
        },
        {
          type: 'longitudeMin',
          template: 'Longitude for [short description] must be between -9 and 2'
        },
        {
          type: 'longitudeMax',
          template: 'Longitude for [short description] must be between -9 and 2'
        }
      ]
    }
  }

  static isLatLong(value?: FormStateValue | FormState): value is LatLongState {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.latitude) &&
      NumberField.isNumber(value.longitude)
    )
  }
}

export function getValidatorLatLong(component: LatLongField) {
  return createLocationFieldValidator(component)
}
