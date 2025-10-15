import { type Server } from '@hapi/hapi'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import * as fixtures from '~/test/fixtures/index.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

describe('Postcode lookup plugin', () => {
  let server: Server

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('Plugin registration', () => {
    test('Registers plugin with ordnance survey key', async () => {
      server = await createServer({
        services: defaultServices,
        ordnanceSurveyApiKey: 'dummy'
      })
      await server.initialize()

      expect(server.registrations).toHaveProperty(
        '@defra/forms-engine-plugin/postcode-lookup',
        {
          name: '@defra/forms-engine-plugin/postcode-lookup',
          options: { ordnanceSurveyApiKey: 'dummy' },
          version: undefined
        }
      )

      expect(
        server.table().find((route) => route.path === '/postcode-lookup')
      ).toBeDefined()
    })

    test('Does not register plugin when no ordnance survey key is provided', async () => {
      server = await createServer({
        services: defaultServices
      })
      await server.initialize()

      expect(server.registrations).not.toHaveProperty(
        '@defra/forms-engine-plugin/postcode-lookup',
        {
          name: '@defra/forms-engine-plugin/postcode-lookup',
          options: { ordnanceSurveyApiKey: 'dummy' },
          version: undefined
        }
      )

      expect(
        server.table().find((route) => route.path === '/postcode-lookup')
      ).toBeUndefined()
    })
  })
})
