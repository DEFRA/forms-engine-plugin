import {
  ComponentType,
  hasFormComponents,
  isFormType
} from '@defra/forms-model'
import joi from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class DeclarationField extends FormComponent {
  /** @type {DeclarationFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {string | undefined} */
  declarationConfirmationLabel

  /** @type {ArraySchema<string[]>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {BooleanSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {string} */
  content

  /** @type {number} */
  headerStartLevel

  /**
   * @param {DeclarationFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options, content } = def

    let checkboxSchema = joi.string().valid('true')

    if (options.required !== false) {
      checkboxSchema = checkboxSchema.required()
    }

    const formSchema = joi
      .array()
      .items(checkboxSchema, joi.string().valid('unchecked').strip())
      .label(this.label)
      .single()
      .messages({
        'any.required': /** @type {string} */ (
          messageTemplate.declarationRequired
        ),
        'any.unknown': /** @type {string} */ (
          messageTemplate.declarationRequired
        ),
        'array.includesRequiredUnknowns': /** @type {string} */ (
          messageTemplate.declarationRequired
        )
      })

    this.formSchema = formSchema
    this.stateSchema = joi.boolean().cast('string').label(this.label).required()

    this.options = options
    this.content = content
    // Store only the form-authored label (if provided). If absent, getViewModel
    // resolves the default via t() at render time so the correct language is used.
    this.declarationConfirmationLabel = options.declarationConfirmationLabel
    const formComponents = hasFormComponents(props.page?.pageDef)
      ? props.page.pageDef.components
      : []
    const numOfQuestionsOnPage = formComponents.filter((q) =>
      isFormType(q.type)
    ).length
    const hasGuidance = formComponents.some(
      (comp, idx) => comp.type === ComponentType.Markdown && idx === 0
    )
    this.headerStartLevel = numOfQuestionsOnPage < 2 && !hasGuidance ? 2 : 3
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormValueFromState(state) {
    const { name } = this
    return state[name] === true ? 'true' : 'false'
  }

  /**
   * @param {FormSubmissionState} state
   * @returns {FormPayload}
   */
  getFormDataFromState(state) {
    const { name } = this
    return { [name]: state[name] === true ? 'true' : 'false' }
  }

  /**
   * @param {FormPayload} payload
   * @returns {FormState}
   */
  getStateFromValidForm(payload) {
    const { name } = this
    const payloadValue = payload[name]
    const value =
      this.isValue(payloadValue) &&
      payloadValue.length > 0 &&
      payloadValue.every((v) => {
        return v === 'true'
      })

    return { [name]: value }
  }

  /**
   * @param {FormValue | FormPayload} value
   * @returns {boolean}
   */
  getContextValueFromFormValue(value) {
    return value === 'true'
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  getFormValue(value) {
    return this.isValue(value) ? value : undefined
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { declarationRequired } = buildValidationMessages(translator.t)
    const msg = /** @type {string} */ (
      /** @type {unknown} */ (declarationRequired)
    )
    return {
      [this.name]: /** @type {LanguageMessages} */ (
        /** @type {unknown} */ ({
          'any.required': msg,
          'any.unknown': msg,
          'array.includesRequiredUnknowns': msg
        })
      )
    }
  }

  /**
   * @param {FormValue | FormPayload} value
   * @param {Translator} [translator]
   * @returns {string}
   */
  getDisplayStringFromFormValue(
    value,
    translator = this.model.createTranslator()
  ) {
    const { t } = translator
    return value === 'true'
      ? (this.declarationConfirmationLabel ??
          t('components.declarationField.defaultLabel'))
      : t('components.declarationField.notProvided')
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { payload, translator = this.model.createTranslator() } = context

    const { t, tComponent } = translator

    const {
      hint,
      declarationConfirmationLabel = t(
        'components.declarationField.defaultLabel'
      )
    } = this
    const content = tComponent(this.def, 'content')

    const viewModel = super.getViewModel(context)
    let { fieldset, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    const payloadValue = payload[this.name]
    const isChecked =
      payloadValue === 'true' ||
      payloadValue === true ||
      (Array.isArray(payloadValue) && payloadValue.some((x) => x === 'true'))

    return {
      ...viewModel,
      hint: hint ? { text: hint } : undefined,
      fieldset,
      content,
      items: [
        {
          text: declarationConfirmationLabel,
          value: 'true',
          checked: isChecked
        }
      ],
      headerStartLevel: this.headerStartLevel
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is Item['value'][]}
   */
  isValue(value) {
    if (!Array.isArray(value)) {
      return false
    }

    // Skip checks when empty
    if (!value.length) {
      return true
    }

    return value.every(isFormValue)
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return DeclarationField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.declarationRequired }
      ],
      advancedSettingsErrors: []
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is boolean}
   */
  static isBool(value) {
    return isFormValue(value) && typeof value === 'boolean'
  }
}

/**
 * @import { DeclarationFieldComponent, Item } from '@defra/forms-model'
 * @import { ArraySchema, BooleanSchema, LanguageMessages } from 'joi'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList, FormPayload, FormState, FormStateValue, FormSubmissionState, FormValue } from '~/src/server/plugins/engine/types.js'
 */
