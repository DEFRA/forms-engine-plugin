import { ComponentType, FormStatus } from '@defra/forms-model'
import lowerFirst from 'lodash/lowerFirst.js'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { getAvailableLanguages } from '~/src/server/plugins/engine/i18n/languages.js'
import { dispatch } from '~/src/server/plugins/postcode-lookup/routes/index.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

export class UkAddressField extends FormComponent {
  /** @type {UkAddressFieldComponent['options']} */
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
   * @param {UkAddressFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { name, options } = def

    const isRequired = options.required !== false
    const hideOptional = !!options.optionalText
    const hideTitle = !!options.hideTitle
    this.collection = new ComponentCollection(
      [
        {
          type: ComponentType.TextField,
          name: `${name}__uprn`,
          title: 'components.addressField.uprn',
          schema: {},
          options: {
            required: false,
            classes: 'hidden'
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__addressLine1`,
          title: 'components.addressField.line1',
          schema: { max: 100 },
          options: {
            autocomplete: 'address-line1',
            required: isRequired,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__addressLine2`,
          title: 'components.addressField.line2',
          schema: { max: 100 },
          options: {
            autocomplete: 'address-line2',
            required: false,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__town`,
          title: 'components.addressField.town',
          schema: { max: 100 },
          options: {
            autocomplete: 'address-level2',
            classes: 'govuk-!-width-two-thirds',
            required: isRequired,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__county`,
          title: 'components.addressField.county',
          schema: { max: 100 },
          options: {
            autocomplete: 'address-level1',
            required: false,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__postcode`,
          title: 'components.addressField.postcode',
          schema: {
            regex: '^[a-zA-Z]{1,2}\\d[a-zA-Z\\d]?\\s?\\d[a-zA-Z]{2}$'
          },
          options: {
            autocomplete: 'postal-code',
            classes: 'govuk-input--width-10',
            required: isRequired,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        }
      ],
      { ...props, parent: this }
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
    return this.isState(value) ? value : undefined
  }

  /**
   * @param {UkAddressState | undefined} value
   */
  getContextValueFromFormValue(value) {
    if (!value) {
      return null
    }

    return Object.entries(value)
      .filter(([key, value]) => key !== 'uprn' && Boolean(value))
      .map(([, value]) => value)
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  /**
   * @param {UkAddressState | undefined} value
   * @param {Translator} [_translator]
   * @returns {string}
   */
  getDisplayStringFromFormValue(value, _translator) {
    return this.getContextValueFromFormValue(value)?.join(', ') ?? ''
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
   * Returns one error per child field
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getViewErrors(errors, translator = this.model.createTranslator()) {
    const { t } = translator

    const uniqueErrors = this.getErrors(errors, translator)?.filter(
      (error, index, self) =>
        index === self.findIndex((err) => err.name === error.name)
    )

    // When using postcode lookup, the address fields are hidden
    // so we replace any individual validation messages with a single one
    if (this.shouldUsePostcodeLookup() && uniqueErrors?.length) {
      const { name, label } = this

      return [
        {
          name,
          path: [name],
          href: `#${name}`,
          text: t('components.addressField.enterAddress', {
            shortDescription: lowerFirst(label)
          })
        }
      ]
    }

    return uniqueErrors
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { payload, translator = this.model.createTranslator() } = context

    const { collection, name, options } = this

    const viewModel = super.getViewModel(context)
    let { fieldset, hint, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,

        /**
         * For screen readers, only hide legend visually. This can be overridden
         * by single component (see QuestionPageController and showTitle handling)
         */
        classes: options.hideTitle
          ? 'govuk-visually-hidden'
          : 'govuk-fieldset__legend--m'
      }
    }

    if (hint) {
      hint.id ??= `${name}-hint`
      fieldset.attributes ??= {
        'aria-describedby': hint.id
      }
    }

    const components = collection.getViewModel(context)

    // Hide UPRN
    const uprn = components.at(0)

    if (!uprn) {
      throw new Error('No UPRN')
    }

    uprn.model.formGroup = { classes: 'app-hidden' }

    // Postcode lookup
    const usePostcodeLookup = this.shouldUsePostcodeLookup()

    const value = usePostcodeLookup
      ? this.getDisplayStringFromState(payload, translator)
      : undefined

    return {
      ...viewModel,
      value,
      fieldset,
      components,
      usePostcodeLookup
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is UkAddressState}
   */
  isState(value) {
    return UkAddressField.isUkAddress(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return UkAddressField.getAllPossibleErrors()
  }

  /**
   * @private
   */
  shouldUsePostcodeLookup() {
    return !!(this.options.usePostcodeLookup && this.model.ordnanceSurveyApiKey)
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'required', template: 'Enter address line 1' },
        { type: 'required', template: 'Enter town or city' },
        { type: 'required', template: 'Enter postcode' },
        { type: 'format', template: 'Enter valid postcode' }
      ],
      advancedSettingsErrors: []
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is UkAddressState}
   */
  static isUkAddress(value) {
    return (
      isFormState(value) &&
      TextField.isText(value.addressLine1) &&
      TextField.isText(value.town) &&
      TextField.isText(value.postcode)
    )
  }

  /**
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   * @param {PostcodeLookupExternalArgs} args
   */
  static dispatcher(request, h, args) {
    const { controller, component } = args
    const language = resolveLanguage(request)

    const availableLanguages = getAvailableLanguages(controller.model.def)
    const languages = availableLanguages.length
      ? { languages: availableLanguages }
      : {}

    const translator = controller.model.createTranslator(language)
    const { tComponent, tForm } = translator

    return dispatch(request, h, {
      formName: tForm('title'),
      formId: controller.model.formId,
      formStatus: args.isLive ? FormStatus.Live : FormStatus.Draft,
      componentId: component.id ?? 'unknown',
      componentName: component.name,
      componentHint: tComponent(component, 'hint'),
      componentTitle: tComponent(component, 'title') || controller.title,
      step: args.actionArgs.step,
      sourceUrl: args.sourceUrl,
      language: translator.language,
      ...languages
    })
  }
}

/**
 * @typedef {Record<string, string> & {
 *   uprn: string
 *   addressLine1: string
 *   addressLine2: string
 *   town: string
 *   county: string
 *   postcode: string
 * }} UkAddressState
 */

/**
 * @import { UkAddressFieldComponent } from '@defra/forms-model'
 * @import { ObjectSchema } from 'joi'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormRequestPayload, FormResponseToolkit } from '~/src/server/plugins/engine/types/index.js'
 * @import { ErrorMessageTemplateList, FormPayload, FormState, FormStateValue, FormSubmissionError, FormSubmissionState, PostcodeLookupExternalArgs } from '~/src/server/plugins/engine/types.js'
 */
