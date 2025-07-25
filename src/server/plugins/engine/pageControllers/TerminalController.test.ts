import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { TerminalPageController } from '~/src/server/plugins/engine/pageControllers/TerminalPageController.js'
import { serverWithSaveAndReturn } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import definition from '~/test/form/definitions/basic.js'

describe('TerminalController', () => {
  let model: FormModel
  let controller1: TerminalPageController

  beforeEach(() => {
    const { pages } = definition

    const page1 = pages[0]

    model = new FormModel(definition, {
      basePath: 'test'
    })

    controller1 = new TerminalPageController(model, page1)
  })

  describe('Route handlers', () => {
    it('does not support POST route handler', () => {
      expect(() => controller1.makePostRouteHandler()).toThrow(
        'POST method not allowed for terminal pages'
      )
    })
  })

  describe('shouldShowSaveAndReturn', () => {
    it('should return false (TerminalPageController does not allow save and return)', () => {
      expect(controller1.shouldShowSaveAndReturn(serverWithSaveAndReturn)).toBe(
        false
      )
    })
  })
})
