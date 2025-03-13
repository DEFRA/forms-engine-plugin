import { plugin } from '~/src/server/plugins/engine/plugin.js'
import {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate
} from '~/src/server/plugins/nunjucks/environment.js'
import * as filters from '~/src/server/plugins/nunjucks/filters/index.js'

export { getPageHref } from '~/src/server/plugins/engine/helpers.js'
export { configureEnginePlugin } from '~/src/server/plugins/engine/configureEnginePlugin.js'
export { CacheService } from '~/src/server/services/index.js'

export { context } from '~/src/server/plugins/nunjucks/context.js'

const globals = {
  checkComponentTemplates,
  checkErrorTemplates,
  evaluate
}

export { filters }
export { globals }
export default plugin
