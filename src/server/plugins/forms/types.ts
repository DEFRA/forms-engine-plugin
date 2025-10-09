import { type ServerRegisterOptions } from '@hapi/hapi'

import { type PluginOptions as EnginePluginOptions } from '~/src/server/plugins/engine/types.js'

export interface PluginOptions {
  engine: EnginePluginOptions
  serverRegistrationOptions?: ServerRegisterOptions
}
