import {
  ComponentType,
  type NotificationBannerComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type Guidance } from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/basic.js'

describe('NotificationBanner', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: NotificationBannerComponent
    let collection: ComponentCollection
    let guidance: Guidance

    beforeEach(() => {
      def = {
        title: 'Important',
        name: 'myComponent',
        type: ComponentType.NotificationBanner,
        content: 'You have 30 days to [appeal this decision](/appeal).',
        options: {}
      } satisfies NotificationBannerComponent

      collection = new ComponentCollection([def], { model })
      guidance = collection.guidance[0]
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = guidance.getViewModel()

        expect(viewModel).toEqual(
          expect.objectContaining({
            attributes: {},
            titleHtml: def.title,
            content: def.content
          })
        )
      })
    })
  })

  describe('Success variant', () => {
    let def: NotificationBannerComponent
    let collection: ComponentCollection
    let guidance: Guidance

    beforeEach(() => {
      def = {
        title: 'Success',
        name: 'myComponent',
        type: ComponentType.NotificationBanner,
        content: 'Your application has been submitted.',
        options: { type: 'success' }
      } satisfies NotificationBannerComponent

      collection = new ComponentCollection([def], { model })
      guidance = collection.guidance[0]
    })

    describe('View model', () => {
      it('includes type: success', () => {
        const viewModel = guidance.getViewModel()

        expect(viewModel).toEqual(
          expect.objectContaining({
            titleHtml: def.title,
            content: def.content,
            type: 'success'
          })
        )
      })
    })
  })
})
