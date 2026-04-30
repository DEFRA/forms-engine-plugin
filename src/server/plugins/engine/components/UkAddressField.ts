import {
  ComponentType,
  type FormComponentsDef,
  type UkAddressFieldComponent
} from '@defra/forms-model'
import { type ObjectSchema } from 'joi'
import lowerFirst from 'lodash/lowerFirst.js'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { type RenderContext } from '~/src/server/plugins/engine/components/types.js'
import { getPluginOptions } from '~/src/server/plugins/engine/helpers.js'
import { t as tPlugin } from '~/src/server/plugins/engine/i18n/index.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import { type QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/plugins/engine/types/index.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type PostcodeLookupExternalArgs
} from '~/src/server/plugins/engine/types.js'
import { dispatch } from '~/src/server/plugins/postcode-lookup/routes/index.js'

export class UkAddressField extends FormComponent {
  declare options: UkAddressFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>
  declare collection: ComponentCollection

  shortDescription: FormComponentsDef['shortDescription']

  constructor(
    def: UkAddressFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { name, options, shortDescription } = def

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
    this.shortDescription = shortDescription
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return this.isState(value) ? value : undefined
  }

  getContextValueFromFormValue(value: UkAddressState | undefined) {
    if (!value) {
      return null
    }

    return Object.entries(value)
      .filter(([key, value]) => key !== 'uprn' && Boolean(value))
      .map(([, value]) => value)
  }

  getContextValueFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(value)
  }

  getDisplayStringFromFormValue(
    value: UkAddressState | undefined,
    _translator?: Translator
  ): string {
    return this.getContextValueFromFormValue(value)?.join(', ') ?? ''
  }

  getDisplayStringFromState(
    state: FormSubmissionState,
    translator?: Translator
  ) {
    const value = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(value, translator)
  }

  /**
   * Returns one error per child field
   */
  getViewErrors(
    errors?: FormSubmissionError[],
    translator?: Translator
  ): FormSubmissionError[] | undefined {
    const t = translator
      ? translator.t
      : (key: string, opts?: Record<string, unknown>) =>
          tPlugin(key, 'en-GB', opts)

    const uniqueErrors = this.getErrors(errors)?.filter(
      (error, index, self) =>
        index === self.findIndex((err) => err.name === error.name)
    )

    // When using postcode lookup, the address fields are hidden
    // so we replace any individual validation messages with a single one
    if (this.shouldUsePostcodeLookup() && uniqueErrors?.length) {
      const { name, shortDescription } = this

      return [
        {
          name,
          path: [name],
          href: `#${name}`,
          text: t('components.addressField.enterAddress', {
            shortDescription: lowerFirst(shortDescription)
          })
        }
      ]
    }

    return uniqueErrors
  }

  getViewModel(context: RenderContext) {
    const { payload } = context
    const { collection, name, options } = this

    const viewModel = super.getViewModel(context)
    let { fieldset, hint, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,

        /**
         * For screen readers, only hide legend visually. This can be overridden
         * by single component {@link QuestionPageController | `showTitle` handling}
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
      ? this.getDisplayStringFromState(payload)
      : undefined

    return {
      ...viewModel,
      value,
      fieldset,
      components,
      usePostcodeLookup
    }
  }

  isState(value?: FormStateValue | FormState): value is UkAddressState {
    return UkAddressField.isUkAddress(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return UkAddressField.getAllPossibleErrors()
  }

  private shouldUsePostcodeLookup() {
    return !!(this.options.usePostcodeLookup && this.model.ordnanceSurveyApiKey)
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
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

  static isUkAddress(
    value?: FormStateValue | FormState
  ): value is UkAddressState {
    return (
      isFormState(value) &&
      TextField.isText(value.addressLine1) &&
      TextField.isText(value.town) &&
      TextField.isText(value.postcode)
    )
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  static async dispatcher(
    request: FormRequestPayload,
    h: FormResponseToolkit,
    args: PostcodeLookupExternalArgs
  ) {
    const { controller, component } = args
    const { getLanguage } = getPluginOptions(request.server)
    const language = getLanguage?.(request) ?? 'en-GB'

    return dispatch(request, h, {
      formName: controller.model.name,
      componentName: component.name,
      componentHint: component.hint,
      componentTitle: component.title || controller.title,
      step: args.actionArgs.step,
      sourceUrl: args.sourceUrl,
      language
    })
  }
}

export interface UkAddressState extends Record<string, string> {
  uprn: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  postcode: string
}
