import {
  ComponentType,
  type EastingNorthingFieldComponent
} from '@defra/forms-model'
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
import { type EastingNorthingState } from '~/src/server/plugins/engine/components/types.js'
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

// British National Grid coordinate limits
const DEFAULT_EASTING_MIN = 0
const DEFAULT_EASTING_MAX = 700000
const DEFAULT_NORTHING_MIN = 0
const DEFAULT_NORTHING_MAX = 1300000

// Easting length constraints (integer values only, no decimals)
// Min: 1 char for values like "0" or single digit values
// Max: 6 chars for values up to 700000 (British National Grid easting limit)
const EASTING_MIN_LENGTH = 1
const EASTING_MAX_LENGTH = 6

// Northing length constraints (integer values only, no decimals)
// Min: 1 char for values like "0" or single digit values
// Max: 7 chars for values up to 1300000 (British National Grid northing limit)
const NORTHING_MIN_LENGTH = 1
const NORTHING_MAX_LENGTH = 7

export class EastingNorthingField extends FormComponent {
  declare options: EastingNorthingFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>
  declare collection: ComponentCollection

  constructor(
    def: EastingNorthingFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { name, options, schema } = def

    const isRequired = options.required !== false

    const eastingMin = schema?.easting?.min ?? DEFAULT_EASTING_MIN
    const eastingMax = schema?.easting?.max ?? DEFAULT_EASTING_MAX
    const northingMin = schema?.northing?.min ?? DEFAULT_NORTHING_MIN
    const northingMax = schema?.northing?.max ?? DEFAULT_NORTHING_MAX

    const customValidationMessages: LanguageMessages =
      convertToLanguageMessages({
        'any.required': messageTemplate.objectMissing,
        'number.base': messageTemplate.objectMissing,
        'number.min': `{{#label}} for ${this.title} must be between {{#limit}} and ${eastingMax}`,
        'number.max': `{{#label}} for ${this.title} must be between ${eastingMin} and {{#limit}}`,
        'number.precision': `{{#label}} for ${this.title} must be between 1 and 6 digits`,
        'number.integer': `{{#label}} for ${this.title} must be between 1 and 6 digits`,
        'number.unsafe': `{{#label}} for ${this.title} must be between 1 and 6 digits`,
        'number.minLength': `{{#label}} for ${this.title} must be between 1 and 6 digits`,
        'number.maxLength': `{{#label}} for ${this.title} must be between 1 and 6 digits`
      })

    const northingValidationMessages: LanguageMessages =
      convertToLanguageMessages({
        'any.required': messageTemplate.objectMissing,
        'number.base': messageTemplate.objectMissing,
        'number.min': `{{#label}} for ${this.title} must be between {{#limit}} and ${northingMax}`,
        'number.max': `{{#label}} for ${this.title} must be between ${northingMin} and {{#limit}}`,
        'number.precision': `{{#label}} for ${this.title} must be between 1 and 7 digits`,
        'number.integer': `{{#label}} for ${this.title} must be between 1 and 7 digits`,
        'number.unsafe': `{{#label}} for ${this.title} must be between 1 and 7 digits`,
        'number.minLength': `{{#label}} for ${this.title} must be between 1 and 7 digits`,
        'number.maxLength': `{{#label}} for ${this.title} must be between 1 and 7 digits`
      })

    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__easting`,
          title: 'Easting',
          schema: {
            min: eastingMin,
            max: eastingMax,
            precision: 0,
            minLength: EASTING_MIN_LENGTH,
            maxLength: EASTING_MAX_LENGTH
          },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-10',
            customValidationMessages
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__northing`,
          title: 'Northing',
          schema: {
            min: northingMin,
            max: northingMax,
            precision: 0,
            minLength: NORTHING_MIN_LENGTH,
            maxLength: NORTHING_MAX_LENGTH
          },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-10',
            customValidationMessages: northingValidationMessages
          }
        }
      ],
      { ...props, parent: this },
      {
        custom: getValidatorEastingNorthing(this),
        peers: [`${name}__easting`, `${name}__northing`]
      }
    )

    this.options = options
    this.formSchema = this.collection.formSchema
    this.stateSchema = this.collection.stateSchema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return EastingNorthingField.isEastingNorthing(value) ? value : undefined
  }

  getDisplayStringFromFormValue(
    value: EastingNorthingState | undefined
  ): string {
    if (!value) {
      return ''
    }

    // CYA page format: <<northingvalue, eastingvalue>>
    return `${value.northing}, ${value.easting}`
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(value)
  }

  getContextValueFromFormValue(
    value: EastingNorthingState | undefined
  ): string | null {
    if (!value) {
      return null
    }

    // Output format: Northing: <<entry>>\nEasting: <<entry>>
    return `Northing: ${value.northing}\nEasting: ${value.easting}`
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
    return EastingNorthingField.isEastingNorthing(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return EastingNorthingField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        {
          type: 'eastingFormat',
          template:
            'Easting for [short description] must be between 1 and 6 digits'
        },
        {
          type: 'northingFormat',
          template:
            'Northing for [short description] must be between 1 and 7 digits'
        }
      ],
      advancedSettingsErrors: [
        {
          type: 'eastingMin',
          template: `Easting for [short description] must be between 0 and 700000`
        },
        {
          type: 'eastingMax',
          template: `Easting for [short description] must be between 0 and 700000`
        },
        {
          type: 'northingMin',
          template: `Northing for [short description] must be between ${DEFAULT_NORTHING_MIN} and ${DEFAULT_NORTHING_MAX}`
        },
        {
          type: 'northingMax',
          template: `Northing for [short description] must be between ${DEFAULT_NORTHING_MIN} and ${DEFAULT_NORTHING_MAX}`
        }
      ]
    }
  }

  static isEastingNorthing(
    value?: FormStateValue | FormState
  ): value is EastingNorthingState {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.easting) &&
      NumberField.isNumber(value.northing)
    )
  }
}

export function getValidatorEastingNorthing(component: EastingNorthingField) {
  return createLocationFieldValidator(component)
}
