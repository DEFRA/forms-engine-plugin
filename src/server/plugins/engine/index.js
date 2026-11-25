import { markdownToHtml } from '@defra/forms-model'

import { engine } from '~/src/server/plugins/engine/helpers.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
import {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate,
  govukRebrand,
  tGlobal
} from '~/src/server/plugins/nunjucks/environment.js'
import * as filters from '~/src/server/plugins/nunjucks/filters/index.js'

export { getPageHref } from '~/src/server/plugins/engine/helpers.js'
export { context } from '~/src/server/plugins/nunjucks/context.js'
export {
  getFirstJourneyPage,
  getFormContext,
  getFormModel,
  resolveFormModel
} from '~/src/server/plugins/engine/form-context.js'
export * from '~/src/server/plugins/engine/form-availability.js'
export { getAvailableLanguages } from '~/src/server/plugins/engine/i18n/languages.js'
export {
  extractMetadataBaseTranslations,
  loadFormTranslations
} from '~/src/server/plugins/engine/i18n/createFormTranslator.js'
export { extractBaseTranslations } from '~/src/server/plugins/engine/i18n/extractBaseTranslations.js'
export { applyUrlParam } from '~/src/server/plugins/nunjucks/filters/applyUrlParam.js'

const globals = {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate,
  govukRebrand,
  t: tGlobal
}

export const VIEW_PATH = 'src/server/plugins/engine/views'
export const PLUGIN_PATH = 'node_modules/@defra/forms-engine-plugin'

export const STATE_NOT_YET_VALIDATED = '__stateNotYetValidated'
export const CURRENT_PAGE_PATH_KEY = '__currentPagePath'
export const MAGIC_LINK_GROUP_ID = '__magicLinkGroupId'

/**
 * @param {Environment} env
 * @param {PluginOptions} pluginOptions
 */
export const prepareNunjucksEnvironment = function (env, pluginOptions) {
  for (const [name, nunjucksFilter] of Object.entries(filters)) {
    env.addFilter(name, nunjucksFilter)
  }

  env.addFilter(
    'markdown',
    /**
     * @param {string} text
     * @param {number} [startingHeaderLevel]
     */
    (text, startingHeaderLevel) =>
      markdownToHtml(text, {
        baseUrl: pluginOptions.baseUrl,
        startingHeaderLevel
      })
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

  // Apply any additional globals to nunjucks engines
  if (pluginOptions.globals) {
    Object.entries(pluginOptions.globals).forEach(([name, fn]) => {
      env.addGlobal(name, fn)
    })
  }
}

export default plugin

/**
 * @import { Environment } from 'nunjucks'
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 */
