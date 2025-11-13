import { type ComponentDef } from '@defra/forms-model'

import {
  createComponent,
  type Component
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

/**
 * Rendered component view model structure
 */
export interface RenderedComponentViewModel {
  type: string
  model: Record<string, unknown>
}

/**
 * ComponentRenderer handles the rendering of components with support for
 * composable architecture (before/after components)
 */
export class ComponentRenderer {
  private page: PageControllerClass

  constructor(page: PageControllerClass) {
    this.page = page
  }

  /**
   * Renders a component definition to its view model(s)
   * Handles single component or array of components
   */
  renderComponentDef(
    def: ComponentDef | ComponentDef[],
    payload: FormPayload,
    errors?: FormSubmissionError[]
  ): RenderedComponentViewModel[] {
    const components = Array.isArray(def) ? def : [def]
    const viewModels: RenderedComponentViewModel[] = []

    for (const componentDef of components) {
      // Cast to access before/after properties that aren't in ComponentDef type
      const composableDef = componentDef as ComponentDef & {
        before?: ComponentDef | ComponentDef[]
        after?: ComponentDef | ComponentDef[]
      }

      // Render "before" components if they exist
      if (composableDef.before) {
        viewModels.push(
          ...this.renderComponentDef(composableDef.before, payload, errors)
        )
      }

      // Create and render the main component
      const component = this.createComponentFromDef(componentDef)
      if (component) {
        const model = component.getViewModel(payload, errors)
        viewModels.push({
          type: componentDef.type,
          model: (model ?? {}) as Record<string, unknown>
        })
      }

      // Render "after" components if they exist
      if (composableDef.after) {
        viewModels.push(
          ...this.renderComponentDef(composableDef.after, payload, errors)
        )
      }
    }

    return viewModels
  }

  /**
   * Creates a component instance from a definition
   */
  private createComponentFromDef(def: ComponentDef): Component | null {
    try {
      // Remove before/after from the definition when creating the component
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { before, after, ...cleanDef } = def as ComponentDef & {
        before?: unknown
        after?: unknown
      }

      // Create component with correct options structure
      const model = this.page.model
      return createComponent(cleanDef as ComponentDef, {
        page: this.page,
        model
      })
    } catch (error) {
      console.error('Failed to create component:', error)
      return null
    }
  }

  /**
   * Flattens the nested structure of view models for template rendering
   */
  flattenViewModels(
    viewModels: RenderedComponentViewModel[]
  ): RenderedComponentViewModel[] {
    const flattened: RenderedComponentViewModel[] = []

    for (const item of viewModels) {
      if (Array.isArray(item)) {
        flattened.push(...this.flattenViewModels(item))
      } else {
        flattened.push(item)
      }
    }

    return flattened
  }
}
