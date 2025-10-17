import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { type Server } from '@hapi/hapi'
import vision from '@hapi/vision'
import nunjucks, { type Environment } from 'nunjucks'
import resolvePkg from 'resolve'

import {
  VIEW_PATH,
  context,
  prepareNunjucksEnvironment
} from '~/src/server/plugins/engine/index.js'
import { type PluginOptions } from '~/src/server/plugins/engine/types.js'
import { VIEW_PATH as POSTCODE_LOOKUP_VIEW_PATH } from '~/src/server/plugins/postcode-lookup/index.js'

export async function registerVision(
  server: Server,
  pluginOptions: PluginOptions
) {
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
          compile: (
            path: string,
            compileOptions: { environment: Environment }
          ) => {
            const template = nunjucks.compile(path, compileOptions.environment)

            return (context: object | undefined) => {
              return template.render(context)
            }
          },
          prepare: (
            options: EngineConfigurationObject,
            next: (err?: Error) => void
          ) => {
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

interface CompileOptions {
  environment: Environment
}

export interface EngineConfigurationObject {
  compileOptions: CompileOptions
}

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
