import { type ComponentDef } from '@defra/forms-model'
import { type CustomValidator } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { ComponentRenderer } from '~/src/server/plugins/engine/components/helpers/component-renderer.js'
import { type Component } from '~/src/server/plugins/engine/components/helpers/components.js'
import { type ComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'
import { type FormQuery } from '~/src/server/routes/types.js'

/**
 * ComponentCollection that supports composable components
 * with before/after relationships
 */
export class ComposableComponentCollection extends ComponentCollection {
  private renderer: ComponentRenderer | undefined

  constructor(
    defs: ComponentDef[],
    props: {
      page?: PageControllerClass
      parent?: Component
      model: FormModel
    },
    schema?: {
      peers?: string[]
      custom?: CustomValidator
    }
  ) {
    // Process defs to extract main components (without before/after for base class)
    const mainDefs = defs.map((def) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { before, after, ...mainDef } = def as ComponentDef & {
        before?: unknown
        after?: unknown
      }
      return mainDef as ComponentDef
    })

    // Initialize base class with main components only
    super(mainDefs, props, schema)

    // Store original defs with before/after
    this.originalDefs = defs

    // Initialize renderer if we have a page
    if (props.page) {
      this.renderer = new ComponentRenderer(props.page)
    } else {
      this.renderer = undefined
    }
  }

  private originalDefs: ComponentDef[]

  /**
   * Override getViewModel to handle composable components
   */
  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionError[],
    query: FormQuery = {}
  ): ComponentViewModel[] {
    // If no renderer (shouldn't happen), fall back to base implementation
    if (!this.renderer) {
      return super.getViewModel(payload, errors, query)
    }

    const result: ComponentViewModel[] = []

    // Process each original definition with before/after support
    for (const def of this.originalDefs) {
      const viewModels = this.renderer.renderComponentDef(def, payload, errors)

      // Convert to component view models that work with existing templates
      for (const vm of viewModels) {
        // Make sure the model has the right structure for existing templates
        const componentModel: Record<string, unknown> = vm.model ?? {}

        result.push({
          type: vm.type,
          isFormComponent: this.isFormComponentType(vm.type),
          model: componentModel
        } as ComponentViewModel)
      }
    }

    return result
  }

  private isFormComponentType(type: string): boolean {
    // List of component types that are form components
    const formTypes = [
      'TextField',
      'EmailAddressField',
      'NumberField',
      'MultilineTextField',
      'TelephoneNumberField',
      'DatePartsField',
      'MonthYearField',
      'UkAddressField',
      'FileUploadField',
      'AutocompleteField',
      'CheckboxesField',
      'RadiosField',
      'SelectField',
      'YesNoField'
    ]

    return formTypes.includes(type)
  }
}
