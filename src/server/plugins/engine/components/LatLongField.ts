import { ComponentType, type LatLongFieldComponent } from '@defra/forms-model'
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
import { createLowerFirstExpression } from '~/src/server/plugins/engine/components/helpers/index.js'
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
    const latitudeMin = schema?.latitude?.min ?? 49.85
    const latitudeMax = schema?.latitude?.max ?? 60.859
    const longitudeMin = schema?.longitude?.min ?? -13.687
    const longitudeMax = schema?.longitude?.max ?? 1.767

    const fieldLabel = lowerFirst(this.label)

    const customValidationMessages: LanguageMessages =
      convertToLanguageMessages({
        'number.precision': props.model.t('components.latLongField.precision'),
        'number.unsafe': props.model.t('components.latLongField.notANumber')
      })

    const latitudeRangeMessage = props.model.t(
      'components.latLongField.latitudeRange',
      { fieldLabel, min: latitudeMin, max: latitudeMax }
    )
    const longitudeRangeMessage = props.model.t(
      'components.latLongField.longitudeRange',
      { fieldLabel, min: longitudeMin, max: longitudeMax }
    )

    const latitudeMessages: LanguageMessages = convertToLanguageMessages({
      ...customValidationMessages,
      'any.required': props.model.t('components.latLongField.latitudeRequired'),
      'number.base': props.model.t('components.latLongField.latitudeBase', {
        fieldLabel
      }),
      'number.min': latitudeRangeMessage,
      'number.max': latitudeRangeMessage
    })

    const longitudeMessages: LanguageMessages = convertToLanguageMessages({
      ...customValidationMessages,
      'any.required': props.model.t(
        'components.latLongField.longitudeRequired'
      ),
      'number.base': props.model.t('components.latLongField.longitudeBase', {
        fieldLabel
      }),
      'number.min': longitudeRangeMessage,
      'number.max': longitudeRangeMessage
    })

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

    // Output format: Latitude: <<entry>>\nLongitude: <<entry>>
    return `Latitude: ${value.latitude}\nLongitude: ${value.longitude}`
  }

  getContextValueFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)
    return getLocationFieldViewModel(this, viewModel, payload, errors)
  }

  getViewErrors(
    errors?: FormSubmissionError[]
  ): FormSubmissionError[] | undefined {
    const allErrors = this.getErrors(errors)
    return deduplicateErrorsByHref(allErrors)
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

  static isLatLong(value?: FormStateValue | FormState): value is LatLongState {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.latitude) &&
      NumberField.isNumber(value.longitude)
    )
  }
}
