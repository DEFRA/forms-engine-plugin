import { ComponentType } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import definition from '~/test/form/definitions/basic.js'

describe('InsetText', () => {
  /** @type {FormModel} */
  let model

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    /** @type {InsetTextComponent} */
    let def
    /** @type {ComponentCollection} */
    let collection
    /** @type {Guidance} */
    let guidance

    beforeEach(() => {
      def = /** @satisfies {InsetTextComponent} */ ({
        title: 'Inset text guidance',
        name: 'myComponent',
        type: ComponentType.InsetText,
        content: 'Lorem ipsum dolor sit amet',
        options: {}
      })

      collection = new ComponentCollection([def], { model })
      guidance = collection.guidance[0]
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = guidance.getViewModel({
          payload: {},
          translator: stubTranslator
        })

        expect(viewModel).toEqual(
          expect.objectContaining({
            attributes: {},
            content: def.content
          })
        )
      })
    })
  })
})

/**
 * @import { InsetTextComponent } from '@defra/forms-model'
 * @import { Guidance } from '~/src/server/plugins/engine/components/helpers/components.js'
 */
