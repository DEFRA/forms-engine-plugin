import { type GeospatialFieldComponent } from '@defra/forms-model'
import { type ArraySchema } from 'joi'

import { type ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  FormComponent,
  isGeospatialState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { geospatialSchema } from '~/src/server/plugins/engine/components/helpers/geospatial.js'
import { getGridRef } from '~/src/server/plugins/engine/components/helpers/gridref.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type GeospatialState
} from '~/src/server/plugins/engine/types.js'

export class GeospatialField extends FormComponent {
  declare options: GeospatialFieldComponent['options']
  declare formSchema: ArraySchema<GeospatialState>
  declare stateSchema: ArraySchema<GeospatialState>

  constructor(
    def: GeospatialFieldComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { options } = def

    let formSchema = geospatialSchema.label(this.label).required()

    if (options.required !== false) {
      formSchema = formSchema.min(1)
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema.default(null)
    this.options = options
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  getDisplayStringFromFormValue(features: GeospatialState | undefined): string {
    if (!features?.length) {
      return ''
    }

    return features
      .map((feature) => {
        return `${feature.properties.description}:\n${getGridRef(feature)}\n`
      })
      .join('\n')
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const features = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(features)
  }

  getContextValueFromFormValue(
    features: GeospatialState | undefined
  ): string[] | null {
    return features?.map(({ id }) => id) ?? null
  }

  getContextValueFromState(state: FormSubmissionState) {
    const features = this.getFormValueFromState(state)

    return this.getContextValueFromFormValue(features)
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)
    const value =
      typeof viewModel.value === 'string'
        ? viewModel.value
        : JSON.stringify(viewModel.value, null, 2)

    return {
      ...viewModel,
      value
    }
  }

  isValue(value?: FormStateValue | FormState): value is GeospatialState {
    return isGeospatialState(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    const staticErrors = GeospatialField.getAllPossibleErrors()
    return {
      ...staticErrors,
      advancedSettingsErrors: [...staticErrors.advancedSettingsErrors]
    }
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [{ type: 'required', template: messageTemplate.required }],
      advancedSettingsErrors: [
        { type: 'object.invalidjson', template: messageTemplate.format }
      ]
    }
  }
}
