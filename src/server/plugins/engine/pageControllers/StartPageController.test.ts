import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { StartPageController } from '~/src/server/plugins/engine/pageControllers/StartPageController.js'
import { serverWithSaveAndReturn } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import definition from '~/test/form/definitions/basic.js'

describe('StartPageController', () => {
  let model: FormModel
  let controller: StartPageController

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    // Create a mock page for StartPageController
    const mockPage = {
      ...definition.pages[0],
      controller: 'start'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    controller = new StartPageController(model, mockPage as any)
  })

  describe('shouldShowSaveAndReturn', () => {
    it('should return false (StartPageController does not allow save and return)', () => {
      expect(controller.shouldShowSaveAndReturn(serverWithSaveAndReturn)).toBe(
        false
      )
    })
  })
})
