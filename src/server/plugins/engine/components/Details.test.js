import { ComponentType } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import definition from '~/test/form/definitions/basic.js'

describe('Details', () => {
  /** @type {FormModel} */
  let model

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    /** @type {DetailsComponent} */
    let def
    /** @type {ComponentCollection} */
    let collection
    /** @type {Guidance} */
    let guidance

    beforeEach(() => {
      def = /** @satisfies {DetailsComponent} */ ({
        title: 'Details guidance',
        name: 'myComponent',
        type: ComponentType.Details,
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
            html: def.content,
            summaryHtml: def.title
          })
        )
      })
    })
  })
})

/**
 * @import { DetailsComponent } from '@defra/forms-model'
 * @import { Guidance } from '~/src/server/plugins/engine/components/helpers/components.js'
 */
