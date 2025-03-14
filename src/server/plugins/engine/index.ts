import { type Environment } from 'nunjucks'

import { plugin } from '~/src/server/plugins/engine/plugin.js'
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

export const prepareNunjucksEnvironment = function (env: Environment) {
  for (const [name, nunjucksFilter] of Object.entries(filters)) {
    env.addFilter(name, nunjucksFilter)
  }

  for (const [name, nunjucksGlobal] of Object.entries(globals)) {
    env.addGlobal(name, nunjucksGlobal)
  }
}

export default plugin
