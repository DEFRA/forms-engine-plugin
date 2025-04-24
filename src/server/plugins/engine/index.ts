import { type Environment } from 'nunjucks'

import { engine } from '~/src/server/plugins/engine/helpers.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
import { type FilterFunction } from '~/src/server/plugins/engine/types.js'
import {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate
} from '~/src/server/plugins/nunjucks/environment.js'
import * as filters from '~/src/server/plugins/nunjucks/filters/index.js'

export { getPageHref } from '~/src/server/plugins/engine/helpers.js'
export { configureEnginePlugin } from '~/src/server/plugins/engine/configureEnginePlugin.js'
export { context } from '~/src/server/plugins/nunjucks/context.js'

const globals = {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate
}

export const VIEW_PATH = 'src/server/plugins/engine/views'
export const PLUGIN_PATH = 'node_modules/@defra/forms-engine-plugin'

export const prepareNunjucksEnvironment = function (
  env: Environment,
  additionalFilters?: Record<string, FilterFunction>
) {
  for (const [name, nunjucksFilter] of Object.entries(filters)) {
    env.addFilter(name, nunjucksFilter)
  }

  for (const [name, nunjucksGlobal] of Object.entries(globals)) {
    env.addGlobal(name, nunjucksGlobal)
  }

  // Apply any additional filters to both the liquid and nunjucks engines
  if (additionalFilters) {
    for (const [name, filter] of Object.entries(additionalFilters)) {
      env.addFilter(name, filter)
      engine.registerFilter(name, filter)
    }
  }
}

export default plugin
