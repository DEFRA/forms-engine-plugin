import { type ResponseObject } from '@hapi/hapi'

import * as Components from '~/src/server/plugins/engine/components/index.js'
import {
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/plugins/engine/types/index.js'
import { type ExternalArgs } from '~/src/server/plugins/engine/types.js'

// Type guard for ExternalComponent
export function isExternalComponent(
  component: unknown
): component is ExternalComponent {
  return typeof (component as ExternalComponent).dispatcher === 'function'
}

// External components are guaranteed to have a dispatcher method
export interface ExternalComponent {
  dispatcher(
    request: FormRequestPayload,
    h: FormResponseToolkit,
    args: ExternalArgs
  ): ResponseObject
}

/**
 * Returns internal and external components from a componentMap, regardless of error state.
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
