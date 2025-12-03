import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  checkFormStatus,
  encodeUrl
} from '~/src/server/plugins/engine/helpers.js'

const logger = createLogger()

/** @type {Record<string, string> | undefined} */
let webpackManifest

/**
 * @param {AnyFormRequest | null} request
 */
export async function context(request) {
  const { params, response } = request ?? {}

  const { isPreview: isPreviewMode, state: formState } = checkFormStatus(params)

  // Only add the slug in to the context if the response is OK.
  // Footer meta links are not rendered when the slug is missing.
  const isResponseOK =
    !Boom.isBoom(response) && response?.statusCode === StatusCodes.OK

  const pluginStorage = request?.server.plugins['forms-engine-plugin']

  let consumerViewContext = {}

  if (!pluginStorage) {
    throw Error('context called before plugin registered')
  }

  if (!pluginStorage.baseLayoutPath) {
    throw Error('Missing baseLayoutPath in plugin.options.nunjucks')
  }

  if (typeof pluginStorage.viewContext === 'function') {
    consumerViewContext = await pluginStorage.viewContext(request)
  }

  /** @type {ViewContext} */
  const ctx = {
    // take consumers props first so we can override it
    ...consumerViewContext,
    baseLayoutPath: pluginStorage.baseLayoutPath,
    currentPath: `${request.path}${request.url.search}`,
    previewMode: isPreviewMode ? formState : undefined,
    slug: isResponseOK ? params?.slug : undefined
  }

  return ctx
}

/**
 * Returns the context for the devtool. Consumers won't have access to this.
 * @param {AnyFormRequest | null} _request
 * @returns {Record<string, unknown> & { assetPath: string, getDxtAssetPath: (asset: string) => string }}
 */
export function devtoolContext(_request) {
  const manifestPath = join(config.get('publicDir'), 'assets-manifest.json')

  if (!webpackManifest) {
    try {
      // eslint-disable-next-line -- Allow JSON type 'any'
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.info(
        `[webpackManifestMissing] Webpack ${basename(manifestPath)} not found - running without asset manifest`
      )
    }
  }

  return {
    config: {
      cdpEnvironment: config.get('cdpEnvironment'),
      designerUrl: config.get('designerUrl'),
      feedbackLink: encodeUrl(config.get('feedbackLink')),
      phaseTag: config.get('phaseTag'),
      serviceName: config.get('serviceName'),
      serviceVersion: config.get('serviceVersion')
    },
    assetPath: '/assets',
    getDxtAssetPath: (asset = '') => {
      return `/${webpackManifest?.[asset] ?? asset}`
    }
  }
}

/**
 * @import { ViewContext } from '~/src/server/plugins/nunjucks/types.js'
 * @import { AnyFormRequest } from '~/src/server/plugins/engine/types.js'
 */
