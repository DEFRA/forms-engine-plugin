import { ComponentType, type HtmlComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type Guidance } from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import { metadata } from '~/test/fixtures/form.js'
import definition from '~/test/form/definitions/basic.js'

describe('HTML', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, metadata, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: HtmlComponent
    let collection: ComponentCollection
    let guidance: Guidance

    beforeEach(() => {
      def = {
        title: 'HTML guidance',
        name: 'myComponent',
        type: ComponentType.Html,
        content: '<p class="govuk-body">\nLorem ipsum dolor sit amet</p>',
        options: {}
      } satisfies HtmlComponent

      collection = new ComponentCollection([def], { model })
      guidance = collection.guidance[0]
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = guidance.getViewModel({
          payload: {},
          errors: undefined,
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
