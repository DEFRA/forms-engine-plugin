import { ComponentType } from '@defra/forms-model'
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
import {
  createLowerFirstExpression,
  getTranslatedLabel
} from '~/src/server/plugins/engine/components/helpers/index.js'
import { t as tPlugin } from '~/src/server/plugins/engine/i18n/index.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

// Precision constants
// UK latitude/longitude requires high precision for accurate location (within ~11mm)
const DECIMAL_PRECISION = 7 // 7 decimal places

export class LatLongField extends FormComponent {
  /** @type {LatLongFieldComponent['options']} */
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
   * @param {LatLongFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { name, options, schema } = def

    const isRequired = options.required !== false

    const { latitudeMin, latitudeMax, longitudeMin, longitudeMax } =
      LatLongField.getMinMax(schema)

    const { latitudeMessages, longitudeMessages } =
      LatLongField.buildErrorMessages(
        this.label,
        latitudeMin,
        latitudeMax,
        longitudeMin,
        longitudeMax,
        'en-GB'
      )

    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__latitude`,
          title: 'components.latLongField.latitude',
          schema: {
            min: latitudeMin,
            max: latitudeMax,
            precision: DECIMAL_PRECISION
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
          title: 'components.latLongField.longitude',
          schema: {
            min: longitudeMin,
            max: longitudeMax,
            precision: DECIMAL_PRECISION
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
        peers: [`${name}__latitude`, `${name}__longitude`]
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
    return LatLongField.isLatLong(value) ? value : undefined
  }

  /**
   * @param {LatLongState | undefined} value
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

    const { t } = translator

    // Output format: Latitude: <<entry>>\nLongitude: <<entry>>
    return `${t('components.latLongField.latitude')}: ${value.latitude}\n${t('components.latLongField.longitude')}: ${value.longitude}`
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
   * @param {LatLongState | undefined} value
   * @returns {string | null}
   */
  getContextValueFromFormValue(value) {
    if (!value) {
      return null
    }

    return `${value.latitude}, ${value.longitude}`
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const viewModel = super.getViewModel(context)
    return getLocationFieldViewModel(this, viewModel, context)
  }

  /**
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getViewErrors(errors, translator = this.model.createTranslator()) {
    const allErrors = this.getErrors(errors, translator)
    return deduplicateErrorsByHref(allErrors)
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  isState(value) {
    return LatLongField.isLatLong(value)
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const def = /** @type {LatLongFieldComponent} */ (this.def)
    const translatedLabel = getTranslatedLabel(def, translator)
    const { latitudeMin, latitudeMax, longitudeMin, longitudeMax } =
      LatLongField.getMinMax(def.schema)
    const { latitudeMessages, longitudeMessages } =
      LatLongField.buildErrorMessages(
        translatedLabel,
        latitudeMin,
        latitudeMax,
        longitudeMin,
        longitudeMax,
        translator.language
      )
    return {
      [`${this.name}__latitude`]: latitudeMessages,
      [`${this.name}__longitude`]: longitudeMessages
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return LatLongField.getAllPossibleErrors()
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
          type: 'latitudeFormat',
          template: createLowerFirstExpression(
            'Enter a valid latitude for {{lowerFirst(#title)}} like 51.519450'
          )
        },
        {
          type: 'longitudeFormat',
          template: createLowerFirstExpression(
            'Enter a valid longitude for {{lowerFirst(#title)}} like -0.127758'
          )
        }
      ],
      advancedSettingsErrors: [
        {
          type: 'latitudeMin',
          template: createLowerFirstExpression(
            'Latitude for {{lowerFirst(#title)}} must be between 49 and 60'
          )
        },
        {
          type: 'latitudeMax',
          template: createLowerFirstExpression(
            'Latitude for {{lowerFirst(#title)}} must be between 49 and 60'
          )
        },
        {
          type: 'longitudeMin',
          template: createLowerFirstExpression(
            'Longitude for {{lowerFirst(#title)}} must be between -9 and 2'
          )
        },
        {
          type: 'longitudeMax',
          template: createLowerFirstExpression(
            'Longitude for {{lowerFirst(#title)}} must be between -9 and 2'
          )
        }
      ]
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is LatLongState}
   */
  static isLatLong(value) {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.latitude) &&
      NumberField.isNumber(value.longitude)
    )
  }

  /**
   * @param {string} label
   * @param {number} latitudeMin
   * @param {number} latitudeMax
   * @param {number} longitudeMin
   * @param {number} longitudeMax
   * @param {string} language
   */
  static buildErrorMessages(
    label,
    latitudeMin,
    latitudeMax,
    longitudeMin,
    longitudeMax,
    language
  ) {
    const fieldLabel = lowerFirst(label)

    /** @type {LanguageMessages} */
    const customValidationMessages = {
      'number.precision': tPlugin(
        'components.latLongField.precision',
        language
      ),
      'number.unsafe': tPlugin('components.latLongField.notANumber', language)
    }

    const latitudeRangeMessage = tPlugin(
      'components.latLongField.latitudeRange',
      language,
      { fieldLabel, min: latitudeMin, max: latitudeMax }
    )
    const longitudeRangeMessage = tPlugin(
      'components.latLongField.longitudeRange',
      language,
      { fieldLabel, min: longitudeMin, max: longitudeMax }
    )

    /** @type {LanguageMessages} */
    const latitudeMessages = {
      ...customValidationMessages,
      'any.required': tPlugin(
        'components.latLongField.latitudeRequired',
        language
      ),
      'number.base': tPlugin('components.latLongField.latitudeBase', language, {
        fieldLabel
      }),
      'number.min': latitudeRangeMessage,
      'number.max': latitudeRangeMessage
    }

    /** @type {LanguageMessages} */
    const longitudeMessages = {
      ...customValidationMessages,
      'any.required': tPlugin(
        'components.latLongField.longitudeRequired',
        language
      ),
      'number.base': tPlugin(
        'components.latLongField.longitudeBase',
        language,
        {
          fieldLabel
        }
      ),
      'number.min': longitudeRangeMessage,
      'number.max': longitudeRangeMessage
    }

    return {
      latitudeMessages,
      longitudeMessages
    }
  }

  // Read schema values from def.schema with fallback defaults
  /**
   * @param {{
   *   latitude?: {
   *     min?: number
   *     max?: number
   *   }
   *   longitude?: {
   *     min?: number
   *     max?: number
   *   }
   * } | undefined} schema
   */
  static getMinMax(schema) {
    return {
      latitudeMin: schema?.latitude?.min ?? 49.85,
      latitudeMax: schema?.latitude?.max ?? 60.859,
      longitudeMin: schema?.longitude?.min ?? -13.687,
      longitudeMax: schema?.longitude?.max ?? 1.767
    }
  }
}

/**
 * @import { LatLongFieldComponent } from '@defra/forms-model'
 * @import { LanguageMessages, ObjectSchema } from 'joi'
 * @import { LatLongState, RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList, FormPayload, FormState, FormStateValue, FormSubmissionError, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
