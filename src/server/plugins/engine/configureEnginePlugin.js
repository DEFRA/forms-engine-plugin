import { join, parse } from 'node:path'

import { EN_GB, FORM_PREFIX } from '~/src/server/constants.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import { formsService } from '~/src/server/plugins/engine/services/localFormsService.js'
import { findPackageRoot } from '~/src/server/plugins/engine/vision.js'
import { devtoolContext } from '~/src/server/plugins/nunjucks/context.js'

/**
 * @param {RouteConfig} [routeConfig]
 * @param {CacheService} [cache]
 * @returns {Promise<{
 *   plugin: typeof plugin
 *   options: PluginOptions
 * }>}
 */
export const configureEnginePlugin = async (
  {
    formFileName,
    formFilePath,
    services,
    controllers,
    preparePageEventRequestOptions,
    onRequest,
    saveAndExit,
    ordnanceSurveyApiKey,
    ordnanceSurveyApiSecret
  } = {},
  cache
) => {
  /** @type {FormModel | undefined} */
  let model

  if (formFileName && formFilePath) {
    const definition = await getForm(join(formFilePath, formFileName))
    const { name } = parse(formFileName)

    const initialBasePath = `${FORM_PREFIX}${name}`

    model = new FormModel(
      definition,
      { basePath: initialBasePath, ordnanceSurveyApiKey },
      services,
      controllers
    )
  }

  return {
    plugin,
    options: {
      model,
      services: services ?? {
        // services for testing, else use the disk loader option for running this service locally
        ...defaultServices,
        formsService: await formsService()
      },
      controllers,
      cache: cache ?? 'session',
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
        paths: [join(findPackageRoot(), 'src/server/devserver')] // custom layout to make it really clear this is not the same as the runner
      },
      viewContext: devtoolContext,
      preparePageEventRequestOptions,
      onRequest,
      baseUrl: 'http://localhost:3009', // always runs locally
      saveAndExit,
      ordnanceSurveyApiKey,
      ordnanceSurveyApiSecret,
      /**
       * @param {AnyFormRequest} request
       */
      getLanguage: ({ query, yar }) => {
        if ('language' in query) {
          yar.set('language', query.language)
        }

        return /** @type {string | undefined} */ (yar.get('language')) ?? EN_GB
      }
    }
  }
}

/**
 * @param {string} importPath
 */
export async function getForm(importPath) {
  const { ext } = parse(importPath)

  /** @type {ImportAttributes} */
  const attributes = {
    type: ext === '.json' ? 'json' : 'module'
  }

  const formImport = /** @type {Promise<{ default: FormDefinition }>} */ (
    import(importPath, { with: attributes })
  )

  const { default: definition } = await formImport
  return definition
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { AnyFormRequest, PluginOptions } from '~/src/server/plugins/engine/types.js'
 * @import { CacheService } from '~/src/server/services/cacheService.js'
 * @import { RouteConfig } from '~/src/server/types.js'
 */
