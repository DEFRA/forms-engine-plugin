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

export class EastingNorthingField extends FormComponent {
  declare options: EastingNorthingFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>
  declare collection: ComponentCollection
  instructionText?: string

  constructor(
    def: EastingNorthingFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { name, options, schema } = def

    const isRequired = options.required !== false
    this.instructionText = options.instructionText

    const eastingMin = schema?.easting?.min ?? 0
    const eastingMax = schema?.easting?.max ?? 70000
    const northingMin = schema?.northing?.min ?? 0
    const northingMax = schema?.northing?.max ?? 1300000

    const customValidationMessages: LanguageMessages =
      convertToLanguageMessages({
        'any.required': messageTemplate.objectMissing,
        'number.base': messageTemplate.objectMissing,
        'number.min': `{{#label}} for ${this.title} must be between {{#limit}} and ${eastingMax}`,
        'number.max': `{{#label}} for ${this.title} must be between ${eastingMin} and {{#limit}}`,
        'number.precision': `{{#label}} for ${this.title} must be between 1 and 5 digits`,
        'number.integer': `{{#label}} for ${this.title} must be between 1 and 5 digits`,
        'number.unsafe': `{{#label}} for ${this.title} must be between 1 and 5 digits`
      })

    const northingValidationMessages: LanguageMessages =
      convertToLanguageMessages({
        'any.required': messageTemplate.objectMissing,
        'number.base': messageTemplate.objectMissing,
        'number.min': `{{#label}} for ${this.title} must be between {{#limit}} and ${northingMax}`,
        'number.max': `{{#label}} for ${this.title} must be between ${northingMin} and {{#limit}}`,
        'number.precision': `{{#label}} for ${this.title} must be between 1 and 7 digits`,
        'number.integer': `{{#label}} for ${this.title} must be between 1 and 7 digits`,
        'number.unsafe': `{{#label}} for ${this.title} must be between 1 and 7 digits`
      })

    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__easting`,
          title: 'Easting',
          schema: { min: eastingMin, max: eastingMax, precision: 0 },
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
          schema: { min: northingMin, max: northingMax, precision: 0 },
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
            'Easting for [short description] must be between 1 and 5 digits'
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
          template:
            'Easting for [short description] must be between 0 and 70000'
        },
        {
          type: 'eastingMax',
          template:
            'Easting for [short description] must be between 0 and 70000'
        },
        {
          type: 'northingMin',
          template:
            'Northing for [short description] must be between 0 and 1300000'
        },
        {
          type: 'northingMax',
          template:
            'Northing for [short description] must be between 0 and 1300000'
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
