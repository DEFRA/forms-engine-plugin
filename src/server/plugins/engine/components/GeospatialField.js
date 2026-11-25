import { EN_GB } from '~/src/server/constants.js'
import {
  FormComponent,
  isGeospatialState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { getMapLayers } from '~/src/server/plugins/engine/components/LocationFieldHelpers.js'
import {
  determineLimits,
  getGeospatialSchema
} from '~/src/server/plugins/engine/components/helpers/geospatial.js'
import { t as tPlugin } from '~/src/server/plugins/engine/i18n/index.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class GeospatialField extends FormComponent {
  /** @type {GeospatialFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {ArraySchema<GeospatialState>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {ArraySchema<GeospatialState>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {{ min?: number, max?: number, length?: number }} */
  limits

  /**
   * @param {GeospatialFieldComponent} def
   * @param {ConstructorParameters<typeof ComponentBase>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options } = def

    let formSchema = getGeospatialSchema(def).label(this.label)

    const isOptional = options.required === false
    const limits = determineLimits(def, isOptional)

    formSchema = formSchema.messages(
      GeospatialField.buildErrorMessages(EN_GB, limits)
    )

    this.formSchema = formSchema
    this.stateSchema = formSchema.default(null)

    if (isOptional) {
      this.stateSchema = this.stateSchema.allow(null)
    }

    this.options = options
    this.limits = limits
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormValueFromState(state) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  getFormValue(value) {
    return this.isValue(value) ? value : undefined
  }

  /**
   * @param {GeospatialState | undefined} features
   * @param {Translator} [translator]
   * @returns {string}
   */
  getDisplayStringFromFormValue(
    features,
    translator = this.model.createTranslator()
  ) {
    if (!features?.length) {
      return ''
    }

    return translator.t('components.geospatialField.added', {
      count: features.length
    })
  }

  /**
   * @param {FormSubmissionState} state
   * @param {Translator} [translator]
   */
  getDisplayStringFromState(state, translator = this.model.createTranslator()) {
    const features = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(features, translator)
  }

  /**
   * @param {GeospatialState | undefined} features
   * @returns {string[] | null}
   */
  getContextValueFromFormValue(features) {
    return features?.map(({ id }) => id) ?? null
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    const features = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(features)
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { translator = this.model.createTranslator() } = context

    const viewModel = super.getViewModel(context)
    const value =
      typeof viewModel.value === 'string'
        ? viewModel.value
        : JSON.stringify(viewModel.value, null, 2)

    return {
      ...viewModel,
      lang: translator.language,
      country: this.options.countries?.at(0),
      geometryTypes: this.options.geometryTypes,
      mapLayers: getMapLayers(this),
      value
    }
  }

  /**
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getErrors(errors, translator = this.model.createTranslator()) {
    const fieldErrors = super.getErrors(errors, translator)

    fieldErrors?.forEach((err) => {
      if (err.name === 'description') {
        err.href = `#description_${err.path[1]}`
        err.text = translator.t(
          'components.geospatialField.validation.descriptionRequired',
          { count: Number(err.path[1]) + 1 }
        )
      } else if (typeof err.name === 'number' && err.context?.country) {
        err.href = `#description_${err.path[1]}`
        err.text = translator.t(
          'components.geospatialField.validation.wrongCountry',
          {
            count: Number(err.path[1]) + 1,
            country: translator.t(`common.${err.context.country}`)
          }
        )
      }
    })

    return fieldErrors
  }

  /**
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getViewErrors(errors, translator = this.model.createTranslator()) {
    return this.getErrors(errors, translator)
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is GeospatialState}
   */
  isValue(value) {
    return isGeospatialState(value)
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { language } = translator
    return {
      [this.name]: GeospatialField.buildErrorMessages(language, this.limits)
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    const staticErrors = GeospatialField.getAllPossibleErrors()
    return {
      ...staticErrors,
      advancedSettingsErrors: [...staticErrors.advancedSettingsErrors]
    }
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.selectRequired },
        {
          type: 'array.min',
          template: '{{#title}} must contain at least 1 item'
        },
        { type: 'object.invalidjson', template: messageTemplate.format }
      ],
      advancedSettingsErrors: []
    }
  }

  /**
   * @param {string} language
   * @param {{ min?: number, max?: number, length?: number }} [limits]
   */
  static buildErrorMessages(language, limits = {}) {
    return {
      'array.min': tPlugin('validation.featuresMin', language, {
        count: limits.min ?? 1
      }),
      'array.max': tPlugin('validation.featuresMax', language, {
        count: limits.max ?? 1
      }),
      'array.length': tPlugin('validation.featuresLength', language, {
        count: limits.length ?? 1
      })
    }
  }
}

/**
 * @import { GeospatialFieldComponent } from '@defra/forms-model'
 * @import { ArraySchema } from 'joi'
 * @import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionError, FormSubmissionState, GeospatialState } from '~/src/server/plugins/engine/types.js'
 */
