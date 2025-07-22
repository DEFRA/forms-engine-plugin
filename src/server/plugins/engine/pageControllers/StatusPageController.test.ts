import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { StatusPageController } from '~/src/server/plugins/engine/pageControllers/StatusPageController.js'
import { serverWithSaveAndReturn } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import definition from '~/test/form/definitions/basic.js'

describe('StatusPageController', () => {
  let model: FormModel
  let controller: StatusPageController

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    // Create a mock page for StatusPageController
    const mockPage = {
      ...definition.pages[0],
      controller: 'status'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    controller = new StatusPageController(model, mockPage as any)
  })

  describe('shouldShowSaveAndReturn', () => {
    it('should return false (StatusPageController does not allow save and return)', () => {
      expect(controller.shouldShowSaveAndReturn(serverWithSaveAndReturn)).toBe(
        false
      )
    })
  })
})
