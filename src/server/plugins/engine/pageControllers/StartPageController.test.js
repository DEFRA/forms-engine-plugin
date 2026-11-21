import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { StartPageController } from '~/src/server/plugins/engine/pageControllers/StartPageController.js'
import { serverWithSaveAndExit } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import definition from '~/test/form/definitions/basic.js'

describe('StartPageController', () => {
  /** @type {FormModel} */
  let model
  /** @type {StartPageController} */
  let controller

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    // Create a mock page for StartPageController
    const mockPage = {
      ...definition.pages[0],
      controller: 'start'
    }

    controller = new StartPageController(model, /** @type {any} */ (mockPage))
  })

  describe('shouldShowSaveAndExit', () => {
    it('should return false (StartPageController does not allow save and exit)', () => {
      expect(controller.shouldShowSaveAndExit(serverWithSaveAndExit)).toBe(
        false
      )
    })
  })
})
