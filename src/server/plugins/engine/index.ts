import { markdownToHtml } from '@defra/forms-model'
import { type Environment } from 'nunjucks'

import { engine } from '~/src/server/plugins/engine/helpers.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
import { type PluginOptions } from '~/src/server/plugins/engine/types.js'
import {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate,
  govukRebrand
} from '~/src/server/plugins/nunjucks/environment.js'
import * as filters from '~/src/server/plugins/nunjucks/filters/index.js'

export { getPageHref } from '~/src/server/plugins/engine/helpers.js'
export { context } from '~/src/server/plugins/nunjucks/context.js'

const globals = {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate,
  govukRebrand
}

export const VIEW_PATH = 'src/server/plugins/engine/views'
export const PLUGIN_PATH = 'node_modules/@defra/forms-engine-plugin'

export const prepareNunjucksEnvironment = function (
  env: Environment,
  pluginOptions: PluginOptions
) {
  for (const [name, nunjucksFilter] of Object.entries(filters)) {
    env.addFilter(name, nunjucksFilter)
  }

  env.addFilter('markdown', (text: string) =>
    markdownToHtml(text, pluginOptions.baseUrl)
  )

  for (const [name, nunjucksGlobal] of Object.entries(globals)) {
    env.addGlobal(name, nunjucksGlobal)
  }

  // Apply any additional filters to both the liquid and nunjucks engines
  if (pluginOptions.filters) {
    for (const [name, filter] of Object.entries(pluginOptions.filters)) {
      env.addFilter(name, filter)
      engine.registerFilter(name, filter)
    }
  }
}

export default plugin
