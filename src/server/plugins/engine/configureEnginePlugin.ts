import { join, parse } from 'node:path'

import { type FormDefinition, type FormMetadata } from '@defra/forms-model'
import { type RequestQuery } from '@hapi/hapi'
import { type Yar } from '@hapi/yar'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import { formsService } from '~/src/server/plugins/engine/services/localFormsService.js'
import { type PluginOptions } from '~/src/server/plugins/engine/types.js'
import { findPackageRoot } from '~/src/server/plugins/engine/vision.js'
import { devtoolContext } from '~/src/server/plugins/nunjucks/context.js'
import { type CacheService } from '~/src/server/services/cacheService.js'
import { type RouteConfig } from '~/src/server/types.js'

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
  }: RouteConfig = {},
  cache?: CacheService
): Promise<{
  plugin: typeof plugin
  options: PluginOptions
}> => {
  let model: FormModel | undefined

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
      getLanguage: (
        query: RequestQuery = {},
        yar?: Yar,
        metadata?: FormMetadata
      ) => {
        const defaultLang = 'en-GB'

        if (yar && 'language' in query) {
          yar.set('language', query.language)
        }

        return (
          yar?.get('language') ??
          // @ts-expect-error - 'language' not part of FormMetadata yet
          metadata?.language ??
          defaultLang
        )
      }
    }
  }
}

export async function getForm(importPath: string) {
  const { ext } = parse(importPath)

  const attributes: ImportAttributes = {
    type: ext === '.json' ? 'json' : 'module'
  }

  const formImport = import(importPath, { with: attributes }) as Promise<{
    default: FormDefinition
  }>

  const { default: definition } = await formImport
  return definition
}
