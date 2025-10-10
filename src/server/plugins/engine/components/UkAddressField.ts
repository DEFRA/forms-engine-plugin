import { ComponentType, type UkAddressFieldComponent } from '@defra/forms-model'
import { type ObjectSchema } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { type QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { type FormQuery } from '~/src/server/plugins/engine/types/index.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { JOURNEY_BASE_URL } from '~/src/server/plugins/postcode-lookup/models/index.js'

export class UkAddressField extends FormComponent {
  declare options: UkAddressFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>
  declare collection: ComponentCollection

  constructor(
    def: UkAddressFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
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
          title: 'UPRN',
          schema: {},
          options: {
            required: false,
            classes: 'hidden'
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__addressLine1`,
          title: 'Address line 1',
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
          title: 'Address line 2',
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
          title: 'Town or city',
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
          title: 'County',
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
          title: 'Postcode',
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

  getDisplayStringFromFormValue(value: UkAddressState | undefined): string {
    return this.getContextValueFromFormValue(value)?.join(', ') ?? ''
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(value)
  }

  /**
   * Returns one error per child field
   */
  getViewErrors(
    errors?: FormSubmissionError[]
  ): FormSubmissionError[] | undefined {
    return this.getErrors(errors)?.filter(
      (error, index, self) =>
        index === self.findIndex((err) => err.name === error.name)
    )
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionError[],
    query?: FormQuery
  ) {
    const { collection, name, options } = this

    const viewModel = super.getViewModel(payload, errors)
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

    const components = collection.getViewModel(payload, errors)

    // Hide UPRN
    const uprn = components.at(0)

    if (!uprn) {
      throw new Error('No UPRN')
    }

    uprn.model.formGroup = { classes: 'app-hidden' }

    // Postcode lookup
    const usePostcodeLookup = !!(
      this.options.usePostcodeLookup && this.model.ordnanceSurveyApiKey
    )
    const value = usePostcodeLookup
      ? this.getDisplayStringFromState(payload)
      : undefined

    let postcodeLookupBaseUrl
    let postcodeLookupQuery

    if (usePostcodeLookup) {
      const searchParams = new URLSearchParams([['clear', 'true']])

      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value ?? '')
        })
      }

      postcodeLookupBaseUrl = JOURNEY_BASE_URL
      postcodeLookupQuery = searchParams.toString()
    }

    return {
      ...viewModel,
      value,
      fieldset,
      components,
      usePostcodeLookup,
      postcodeLookupBaseUrl,
      postcodeLookupQuery
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
}

export interface UkAddressState extends Record<string, string> {
  uprn: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  postcode: string
}
