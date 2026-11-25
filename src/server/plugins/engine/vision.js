import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import vision from '@hapi/vision'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import {
  VIEW_PATH,
  context,
  prepareNunjucksEnvironment
} from '~/src/server/plugins/engine/index.js'
import { VIEW_PATH as POSTCODE_LOOKUP_VIEW_PATH } from '~/src/server/plugins/postcode-lookup/index.js'

/**
 * @param {Server} server
 * @param {PluginOptions} pluginOptions
 */
export async function registerVision(server, pluginOptions) {
  const packageRoot = findPackageRoot()
  const govukFrontendPath = dirname(
    resolvePkg.sync('govuk-frontend/package.json')
  )

  const viewPathResolved = join(packageRoot, VIEW_PATH)
  const postcodeLookupPathResolved = join(
    packageRoot,
    POSTCODE_LOOKUP_VIEW_PATH
  )

  const paths = [
    ...pluginOptions.nunjucks.paths,
    viewPathResolved,
    postcodeLookupPathResolved,
    join(govukFrontendPath, 'dist')
  ]

  await server.register({
    plugin: vision,
    options: {
      engines: {
        html: {
          /**
           * @param {string} path
           * @param {{ environment: Environment }} compileOptions
           */
          compile: (path, compileOptions) => {
            const template = nunjucks.compile(path, compileOptions.environment)

            return /** @param {object | undefined} context */ (context) => {
              return template.render(context)
            }
          },
          /**
           * @param {EngineConfigurationObject} options
           * @param {(err?: Error) => void} next
           */
          prepare: (options, next) => {
            // Nunjucks also needs an additional path configuration
            // to use the templates and macros from `govuk-frontend`
            const environment = nunjucks.configure(paths)

            // Applies custom filters and globals for nunjucks
            // that are required by the `forms-engine-plugin`
            prepareNunjucksEnvironment(environment, pluginOptions)

            options.compileOptions.environment = environment

            next()
          }
        }
      },
      path: paths,
      // Provides global context used with all templates
      context
    }
  })
}

/**
 * @typedef {{
 *   environment: Environment
 * }} CompileOptions
 */

/**
 * @typedef {{
 *   compileOptions: CompileOptions
 * }} EngineConfigurationObject
 */

export function findPackageRoot() {
  const currentFileName = fileURLToPath(import.meta.url)
  const currentDirectoryName = dirname(currentFileName)

  let dir = currentDirectoryName
  while (dir !== '/') {
    if (existsSync(join(dir, 'package.json'))) {
      return dir
    }
    dir = dirname(dir)
  }

  throw new Error('package.json not found in parent directories')
}

/**
 * @import { Server } from '@hapi/hapi'
 * @import { Environment } from 'nunjucks'
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 */
