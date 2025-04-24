import { join, parse } from 'node:path'

import { type FormDefinition } from '@defra/forms-model'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  plugin,
  type PluginOptions
} from '~/src/server/plugins/engine/plugin.js'
import { findPackageRoot } from '~/src/server/plugins/engine/plugin.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import { formsService } from '~/src/server/plugins/engine/services/localFormsService.js'
import { devtoolContext } from '~/src/server/plugins/nunjucks/context.js'
import { type RouteConfig } from '~/src/server/types.js'

export const configureEnginePlugin = async ({
  formFileName,
  formFilePath,
  services,
  controllers
}: RouteConfig = {}): Promise<ServerRegisterPluginObject<PluginOptions>> => {
  let model: FormModel | undefined

  if (formFileName && formFilePath) {
    const definition = await getForm(join(formFilePath, formFileName))
    const { name } = parse(formFileName)

    model = new FormModel(definition, { basePath: name }, services, controllers)
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
        paths: [join(findPackageRoot(), 'src/server/devserver')] // custom layout to make it really clear this is not the same as the runner
      },
      viewContext: devtoolContext
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
