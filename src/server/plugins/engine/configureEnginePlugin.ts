import { join, parse } from 'node:path'

import { type FormDefinition } from '@defra/forms-model'

import { FORM_PREFIX } from '~/src/server/constants.js'
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
import { FormSubmissionState } from './types.js'
import { type Request } from '@hapi/hapi'
import { FormRequest, FormRequestPayload } from '../../routes/types.js'

const getIdentity = (request: Request | FormRequest | FormRequestPayload) => {
  // const { userId, businessId, grantId } = request.auth.credentials || {}
  // For testing purposes, we can hardcode the identity
  const { userId, businessId, grantId } = {
    userId: 'unicornBreederUserId',
    businessId: 'unicornBreederBusinessId',
    grantId: 'unicornBreederGrantId'
  }
  if (!userId || !businessId || !grantId) throw new Error('Missing identity')
  return { userId, businessId, grantId }
}

export const configureEnginePlugin = async ({
  formFileName,
  formFilePath,
  services,
  controllers
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
      keyGenerator: (request: Request | FormRequest | FormRequestPayload) => {
        // const { userId, businessId, grantId } = request.auth.credentials || {}
        const { userId, businessId, grantId } = getIdentity(request)
        if (!userId || !businessId || !grantId)
          throw new Error('Missing identity')

        return `${userId}:${businessId}:${grantId}`
      },
      rehydrationFn: async (
        request: Request | FormRequest | FormRequestPayload
      ) => {
        return await fetchSavedStateFromApi(request)
      },
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
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

export async function fetchSavedStateFromApi(
  request: Request | FormRequest | FormRequestPayload
): Promise<FormSubmissionState> {
  // const { userId, businessId, grantId } = request.auth.credentials || {}
  const { userId, businessId, grantId } = getIdentity(request)
  if (!userId || !businessId || !grantId) throw new Error('Missing identity')

  let json: FormSubmissionState = {}
  try {
    const response = await fetch(
      `http://localhost:3002/state/?userId=${userId}&businessId=${businessId}&grantId=${grantId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      return {}
    }

    json = await response.json()
  } catch (err) {
    request.logger.error(
      ['fetch-saved-state'],
      'Failed to fetch saved state from API',
      err
    )
    throw err
  }

  return json ?? {}
}
