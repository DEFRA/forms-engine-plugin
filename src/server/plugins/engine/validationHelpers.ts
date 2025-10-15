import * as Components from '~/src/server/plugins/engine/components/index.js'

// Type guard for ExternalComponent
export function isExternalComponent(
  component: unknown
): component is ExternalComponent {
  return typeof (component as ExternalComponent).getRoutes === 'function'
}

// External components are guaranteed to have getRoutes
export interface ExternalComponent {
  getRoutes(): { routes: unknown[]; entrypoint: string }
}

/**
 * Returns internal and external components from a componentMap, regardless of error state.
 * @param componentMap - Map of component names to component instances
 * @returns An object containing internalComponents and externalComponents arrays
 */
export function getComponentsByType(): {
  internalComponents: Map<string, unknown>
  externalComponents: Map<string, ExternalComponent>
} {
  const internalComponents = new Map<string, unknown>()
  const externalComponents = new Map<string, ExternalComponent>()

  const componentMap = new Map<string, unknown>(Object.entries(Components))

  for (const [name, component] of componentMap.entries()) {
    if (isExternalComponent(component)) {
      externalComponents.set(name, component)
    } else {
      internalComponents.set(name, component)
    }
  }

  return { internalComponents, externalComponents }
}
