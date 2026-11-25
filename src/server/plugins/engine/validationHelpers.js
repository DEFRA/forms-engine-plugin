import * as Components from '~/src/server/plugins/engine/components/index.js'

// Type guard for ExternalComponent
/**
 * @param {unknown} component
 * @returns {component is ExternalComponent}
 */
export function isExternalComponent(component) {
  return (
    typeof (/** @type {ExternalComponent} */ (component).dispatcher) ===
    'function'
  )
}

// External components are guaranteed to have a dispatcher method
/* eslint-disable jsdoc/valid-types -- the JSDoc type parser rejects method signatures in a type literal; tsc reads them */
/**
 * @typedef {{
 *   dispatcher(
 *     request: FormRequestPayload,
 *     h: FormResponseToolkit,
 *     args: ExternalArgs
 *   ): Promise<ResponseObject>
 * }} ExternalComponent
 */
/* eslint-enable jsdoc/valid-types */

/**
 * Returns internal and external components from a componentMap, regardless of error state.
 * @returns {{
 *   internalComponents: Map<string, unknown>
 *   externalComponents: Map<string, ExternalComponent>
 * }} An object containing internalComponents and externalComponents arrays
 */
export function getComponentsByType() {
  const internalComponents = /** @type {Map<string, unknown>} */ (new Map())
  const externalComponents = /** @type {Map<string, ExternalComponent>} */ (
    new Map()
  )

  const componentMap = /** @type {Map<string, unknown>} */ (
    new Map(Object.entries(Components))
  )

  for (const [name, component] of componentMap.entries()) {
    if (isExternalComponent(component)) {
      externalComponents.set(name, component)
    } else {
      internalComponents.set(name, component)
    }
  }

  return { internalComponents, externalComponents }
}

/**
 * @import { ResponseObject } from '@hapi/hapi'
 * @import { FormRequestPayload, FormResponseToolkit } from '~/src/server/plugins/engine/types/index.js'
 * @import { ExternalArgs } from '~/src/server/plugins/engine/types.js'
 */
