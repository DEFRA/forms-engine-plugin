import { Server } from '@hapi/hapi'

import { validatePluginOptions } from '~/src/server/plugins/engine/options.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'

jest.mock('~/src/server/plugins/engine/options')

describe('@defra/forms-engine-plugin', () => {
  it('throws an error if plugin options are invalid', async () => {
    jest
      .mocked(validatePluginOptions)
      .mockRejectedValueOnce(new Error('Invalid plugin options'))

    await expect(async () => {
      const server = new Server()
      await server.register(plugin)
    }).rejects.toThrow('Invalid plugin options')
  })
})
