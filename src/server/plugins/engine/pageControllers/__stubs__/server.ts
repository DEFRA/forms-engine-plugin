import { type Server } from '@hapi/hapi'

import { type PluginOptions } from '~/src/server/plugins/engine/types.js'
import { type CacheService } from '~/src/server/services/index.js'

export const server: Server = {
  plugins: {
    'forms-engine-plugin': {
      baseLayoutPath: '',
      cacheService: {} as CacheService
    }
  }
} as Server // only mocking out properties we care about;

export const serverWithSaveAndReturn: Server = {
  plugins: {
    ...server.plugins,
    'forms-engine-plugin': {
      ...server.plugins['forms-engine-plugin'],
      saveAndReturn: {
        keyGenerator: jest.fn().mockReturnValue('foobar'),
        sessionHydrator: jest.fn().mockReturnValue({}),
        sessionPersister: jest.fn().mockImplementation(() => Promise.resolve())
      } as Pick<PluginOptions, 'saveAndReturn'>
    }
  }
} as Server // only mocking out properties we care about
