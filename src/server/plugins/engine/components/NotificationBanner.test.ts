import {
  ComponentType,
  type NotificationBannerComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
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
    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const def = {
          title: 'Important',
          name: 'myComponent',
          type: ComponentType.NotificationBanner,
          content: 'You have 30 days to [appeal this decision](/appeal).',
          options: {}
        } satisfies NotificationBannerComponent

        const collection = new ComponentCollection([def], { model })
        const viewModel = collection.guidance[0].getViewModel()

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

  describe('With heading', () => {
    describe('View model', () => {
      it('includes heading', () => {
        const def = {
          title: 'Important',
          name: 'myComponent',
          type: ComponentType.NotificationBanner,
          content: 'Contact us if you need help.',
          options: {
            heading: 'There may be a delay in processing your application.'
          }
        } satisfies NotificationBannerComponent

        const collection = new ComponentCollection([def], { model })
        const viewModel = collection.guidance[0].getViewModel()

        expect(viewModel).toEqual(
          expect.objectContaining({
            titleHtml: def.title,
            content: def.content,
            heading: def.options.heading
          })
        )
      })
    })
  })

  describe('Success variant', () => {
    describe('View model', () => {
      it('includes type: success', () => {
        const def = {
          title: 'Success',
          name: 'myComponent',
          type: ComponentType.NotificationBanner,
          content: 'Your application has been submitted.',
          options: { type: 'success' }
        } satisfies NotificationBannerComponent

        const collection = new ComponentCollection([def], { model })
        const viewModel = collection.guidance[0].getViewModel()

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
