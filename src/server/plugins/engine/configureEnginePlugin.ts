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
        paths: [join(findPackageRoot(), 'src/server/devserver')] // custom layout to make it really clear this is not the same as the runner
      },
      viewContext: devtoolContext,
      preparePageEventRequestOptions,
      onRequest,
      baseUrl: 'http://localhost:3009', // always runs locally
      saveAndReturn
      // Uncomment the following lines to enable save and return functionality
      // This is not implemented in devtool mode, but can be used for testing purposes.
      // saveAndReturn: saveAndReturn ?? {
      //   keyGenerator: (request) => {
      //     if (!request.yar.id) {
      //       throw new Error('No session ID found')
      //     }

      //     const state = (request.params.state as string) || ''
      //     const slug = (request.params.slug as string) || ''
      //     return `${request.yar.id}:${state}:${slug}:`
      //   },

      //   sessionHydrator: (request) => {
      //     let state = {}

      //     if (request.params.slug === 'save-and-return-demo') {
      //       logger.info("Loading session for 'save-and-return-demo'")
      //       state = {
      //         applicantFirstName: 'Enrique',
      //         applicantLastName: 'Chase',
      //         applicantEmail: 'e.chase@fictional.defra.gov.uk',
      //         dateOfBirth__day: 1,
      //         dateOfBirth__month: 1,
      //         dateOfBirth__year: 1990,
      //         address__addressLine1: '10 Downing Street',
      //         address__addressLine2: '',
      //         address__town: 'London',
      //         address__county: '',
      //         address__postcode: 'SW1A 2AA',
      //         address__country: 'United Kingdom'
      //       }
      //     }

      //     return Promise.resolve(state)
      //   },

      //   sessionPersister: (state, _request) => {
      //     logger.info(
      //       'Session persister called, but not implemented in devtool mode',
      //       state
      //     )

      //     return Promise.resolve()
      //   }
      // }
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
