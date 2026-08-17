import {
  ComponentType,
  type EastingNorthingFieldComponent
} from '@defra/forms-model'
import { type LanguageMessages, type ObjectSchema } from 'joi'
import lowerFirst from 'lodash/lowerFirst.js'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  deduplicateErrorsByHref,
  getLocationFieldViewModel
} from '~/src/server/plugins/engine/components/LocationFieldHelpers.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import { getEastingNorthingCountryValidator } from '~/src/server/plugins/engine/components/helpers/geospatial.js'
import {
  createLowerFirstExpression,
  getTranslatedLabel
} from '~/src/server/plugins/engine/components/helpers/index.js'
import {
  type EastingNorthingState,
  type RenderContext
} from '~/src/server/plugins/engine/components/types.js'
import { t as tPlugin } from '~/src/server/plugins/engine/i18n/index.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

// British National Grid coordinate limits
const DEFAULT_EASTING_MIN = 0
const DEFAULT_EASTING_MAX = 700000
const DEFAULT_NORTHING_MIN = 0
const DEFAULT_NORTHING_MAX = 1300000

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

    const { eastingMin, eastingMax, northingMin, northingMax } =
      EastingNorthingField.getMinMax(schema)

    const { eastingValidationMessages, northingValidationMessages } =
      EastingNorthingField.buildErrorMessages(
        this.label,
        eastingMin,
        eastingMax,
        northingMin,
        northingMax,
        'en-GB'
      )

    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__easting`,
          title: 'components.eastingNorthingField.easting',
          schema: {
            min: eastingMin,
            max: eastingMax,
            precision: 0
          },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-10',
            customValidationMessages: eastingValidationMessages
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__northing`,
          title: 'components.eastingNorthingField.northing',
          schema: {
            min: northingMin,
            max: northingMax,
            precision: 0
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
        peers: [`${name}__easting`, `${name}__northing`]
      }
    )

    this.options = options

    const country = options.countries?.at(0)

    if (country) {
      this.collection.formSchema = this.collection.formSchema.custom(
        getEastingNorthingCountryValidator(this, country)
      )
      this.collection.stateSchema = this.collection.stateSchema.custom(
        getEastingNorthingCountryValidator(this, country)
      )
    }

    this.formSchema = this.collection.formSchema
    this.stateSchema = this.collection.stateSchema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return EastingNorthingField.isEastingNorthing(value) ? value : undefined
  }

  getDisplayStringFromFormValue(
    value: EastingNorthingState | undefined,
    translator: Translator
  ): string {
    if (!value) {
      return ''
    }

    const { t } = translator

    return `${t('components.eastingNorthingField.easting')}: ${value.easting}\n${t('components.eastingNorthingField.northing')}: ${value.northing}`
  }

  getDisplayStringFromState(
    state: FormSubmissionState,
    translator: Translator
  ) {
    const value = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(value, translator)
  }

  getContextValueFromFormValue(
    value: EastingNorthingState | undefined
  ): string | null {
    if (!value) {
      return null
    }

    return `${value.easting}, ${value.northing}`
  }

  getContextValueFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  getViewModel(context: RenderContext) {
    const viewModel = super.getViewModel(context)
    return getLocationFieldViewModel(this, viewModel, context)
  }

  getErrors(
    translator: Translator,
    errors?: FormSubmissionError[]
  ): FormSubmissionError[] | undefined {
    const fieldErrors = super.getErrors(translator, errors)

    fieldErrors?.forEach((err) => {
      if (err.context?.country) {
        err.text = translator.t(
          'components.eastingNorthingField.wrongCountry',
          { country: translator.t(`common.${err.context.country}`) }
        )
      }
    })

    return fieldErrors
  }

  getViewErrors(
    translator: Translator,
    errors?: FormSubmissionError[]
  ): FormSubmissionError[] | undefined {
    const allErrors = this.getErrors(translator, errors)
    return deduplicateErrorsByHref(allErrors)
  }

  isState(value?: FormStateValue | FormState) {
    return EastingNorthingField.isEastingNorthing(value)
  }

  getValidationMessagesOverride(translator: Translator) {
    const def = this.def as EastingNorthingFieldComponent
    const translatedLabel = getTranslatedLabel(def, translator)
    const { eastingMin, eastingMax, northingMin, northingMax } =
      EastingNorthingField.getMinMax(def.schema)
    const { eastingValidationMessages, northingValidationMessages } =
      EastingNorthingField.buildErrorMessages(
        translatedLabel,
        eastingMin,
        eastingMax,
        northingMin,
        northingMax,
        translator.language
      )
    return {
      [`${this.name}__easting`]: eastingValidationMessages,
      [`${this.name}__northing`]: northingValidationMessages
    }
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
          template: createLowerFirstExpression(
            'Easting for {{lowerFirst(#title)}} must be between 1 and 6 digits'
          )
        },
        {
          type: 'northingFormat',
          template: createLowerFirstExpression(
            'Northing for {{lowerFirst(#title)}} must be between 1 and 7 digits'
          )
        }
      ],
      advancedSettingsErrors: [
        {
          type: 'eastingMin',
          template: createLowerFirstExpression(
            `Easting for {{lowerFirst(#title)}} must be between ${DEFAULT_EASTING_MIN} and ${DEFAULT_EASTING_MAX}`
          )
        },
        {
          type: 'eastingMax',
          template: createLowerFirstExpression(
            `Easting for {{lowerFirst(#title)}} must be between ${DEFAULT_EASTING_MIN} and ${DEFAULT_EASTING_MAX}`
          )
        },
        {
          type: 'northingMin',
          template: createLowerFirstExpression(
            `Northing for {{lowerFirst(#title)}} must be between ${DEFAULT_NORTHING_MIN} and ${DEFAULT_NORTHING_MAX}`
          )
        },
        {
          type: 'northingMax',
          template: createLowerFirstExpression(
            `Northing for {{lowerFirst(#title)}} must be between ${DEFAULT_NORTHING_MIN} and ${DEFAULT_NORTHING_MAX}`
          )
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

  static buildErrorMessages(
    label: string,
    eastingMin: number,
    eastingMax: number,
    northingMin: number,
    northingMax: number,
    language: string
  ) {
    const fieldLabel = lowerFirst(label)

    const eastingDigitsMessage = tPlugin(
      'components.eastingNorthingField.eastingDigits',
      language,
      { fieldLabel }
    )
    const northingDigitsMessage = tPlugin(
      'components.eastingNorthingField.northingDigits',
      language,
      { fieldLabel }
    )

    const eastingValidationMessages: LanguageMessages = {
      'any.required': tPlugin(
        'components.eastingNorthingField.eastingRequired',
        language
      ),
      'number.base': tPlugin(
        'components.eastingNorthingField.eastingRequired',
        language
      ),
      'number.min': tPlugin(
        'components.eastingNorthingField.eastingRange',
        language,
        {
          fieldLabel,
          min: eastingMin,
          max: eastingMax
        }
      ),
      'number.max': tPlugin(
        'components.eastingNorthingField.eastingRange',
        language,
        {
          fieldLabel,
          min: eastingMin,
          max: eastingMax
        }
      ),
      'number.precision': eastingDigitsMessage,
      'number.integer': eastingDigitsMessage,
      'number.unsafe': eastingDigitsMessage
    }

    const northingValidationMessages: LanguageMessages = {
      'any.required': tPlugin(
        'components.eastingNorthingField.northingRequired',
        language
      ),
      'number.base': tPlugin(
        'components.eastingNorthingField.northingRequired',
        language
      ),
      'number.min': tPlugin(
        'components.eastingNorthingField.northingRange',
        language,
        {
          fieldLabel,
          min: northingMin,
          max: northingMax
        }
      ),
      'number.max': tPlugin(
        'components.eastingNorthingField.northingRange',
        language,
        {
          fieldLabel,
          min: northingMin,
          max: northingMax
        }
      ),
      'number.precision': northingDigitsMessage,
      'number.integer': northingDigitsMessage,
      'number.unsafe': northingDigitsMessage
    }
    return {
      eastingValidationMessages,
      northingValidationMessages
    }
  }

  // Read schema values from def.schema with fallback defaults
  static getMinMax(
    schema:
      | {
          easting?: {
            min?: number
            max?: number
          }
          northing?: {
            min?: number
            max?: number
          }
        }
      | undefined
  ) {
    return {
      eastingMin: schema?.easting?.min ?? DEFAULT_EASTING_MIN,
      eastingMax: schema?.easting?.max ?? DEFAULT_EASTING_MAX,
      northingMin: schema?.northing?.min ?? DEFAULT_NORTHING_MIN,
      northingMax: schema?.northing?.max ?? DEFAULT_NORTHING_MAX
    }
  }
}
