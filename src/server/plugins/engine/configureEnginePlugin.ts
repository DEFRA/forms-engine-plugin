import { join, parse } from 'node:path'

import { type FormDefinition } from '@defra/forms-model'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import { formsService } from '~/src/server/plugins/engine/services/localFormsService.js'
import { type PluginOptions } from '~/src/server/plugins/engine/types.js'
import { findPackageRoot } from '~/src/server/plugins/engine/vision.js'
import { devtoolContext } from '~/src/server/plugins/nunjucks/context.js'
import { type RouteConfig } from '~/src/server/types.js'

export const configureEnginePlugin = async ({
  formFileName,
  formFilePath,
  services,
  controllers,
  preparePageEventRequestOptions,
  onRequest,
  saveAndReturn
}: RouteConfig = {}): Promise<{
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
      { basePath: initialBasePath },
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
      cacheName: 'session',
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
        paths: [
          join(findPackageRoot(), 'src/server/devserver'), // custom layout to make it really clear this is not the same as the runner
          join(findPackageRoot(), 'src/server/plugins/engine/views') // add engine views path so dxt-devtool-baselayout.html can find index.html
        ]
      },
      viewContext: devtoolContext,
      preparePageEventRequestOptions,
      onRequest,
      baseUrl: 'http://localhost:3009', // always runs locally
      saveAndReturn
    }

    /*
    To enable custom buttons, use this config:

    ```
      actionHandlers: {
        'withdraw-submission': async (request, _) => {
          await getCacheService(request.server).clearState(request)
          return '/summary'
        }
      }
    ```

    /*
    To enable save and return for testing purposes, use this config:

    ```
    saveAndReturn: {
      keyGenerator: (_) => {
        return `save-and-return`
      },
      sessionHydrator: (_) => {
        return Promise.resolve({
          applicantFirstName: 'Joe'
        })
      },
      sessionPersister: () => {
        console.log('no-op')
      }
    }
    ```

    Then load http://localhost:3009/page-events-demo and the applicantFirstName should be pre-filled as 'Joe'
     */
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
