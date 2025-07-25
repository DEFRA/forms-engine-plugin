import { FORM_PREFIX } from '~/src/server/constants.js'
import {
  FormModel,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import { SummaryPageController } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { serverWithSaveAndReturn } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import {
  createPage,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormState
} from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/repeat-mixed.js'
const basePath = `${FORM_PREFIX}/test`

describe('SummaryViewModel', () => {
  const itemId1 = 'abc-123'
  const itemId2 = 'xyz-987'

  let model: FormModel
  let page: PageControllerClass
  let pageUrl: URL
  let request: FormContextRequest
  let context: FormContext
  let summaryViewModel: SummaryViewModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: `${FORM_PREFIX}/test`
    })

    page = createPage(model, definition.pages[2])
    pageUrl = new URL('http://example.com/repeat/pizza-order/summary')

    request = buildFormContextRequest({
      method: 'get',
      url: pageUrl,
      path: pageUrl.pathname,
      params: {
        path: 'pizza-order',
        slug: 'repeat'
      },
      query: {},
      app: { model }
    })
  })

  describe.each([
    {
      description: '0 items',
      state: {
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      } satisfies FormState,
      keys: [
        'How would you like to receive your pizza?',
        'Pizzas',
        'How you would like to receive your pizza',
        'Pizzas',
        'Pizza'
      ],
      values: ['Collection', 'Not supplied']
    },
    {
      description: '1 item',
      state: {
        $$__referenceNumber: 'foobar',
        orderType: 'delivery',
        pizza: [
          {
            toppings: 'Ham',
            quantity: 2,
            itemId: itemId1
          }
        ]
      } satisfies FormState,
      keys: [
        'How would you like to receive your pizza?',
        'Pizza added',
        'How you would like to receive your pizza',
        'Pizzas',
        'Pizza'
      ],
      values: ['Delivery', 'You added 1 Pizza']
    },
    {
      description: '2 items',
      state: {
        $$__referenceNumber: 'foobar',
        orderType: 'delivery',
        pizza: [
          {
            toppings: 'Ham',
            quantity: 2,
            itemId: itemId1
          },
          {
            toppings: 'Pepperoni',
            quantity: 1,
            itemId: itemId2
          }
        ]
      } satisfies FormState,
      keys: [
        'How would you like to receive your pizza?',
        'Pizzas added',
        'How you would like to receive your pizza',
        'Pizzas',
        'Pizza'
      ],
      values: ['Delivery', 'You added 2 Pizzas']
    }
  ])('Check answers ($description)', ({ state, keys, values }) => {
    beforeEach(() => {
      context = model.getFormContext(request, state)
      summaryViewModel = new SummaryViewModel(request, page, context)
    })

    it('should add title for each section', () => {
      const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

      // 1st summary list has no title
      expect(checkAnswers1).toHaveProperty('title', undefined)

      // 2nd summary list has section title
      expect(checkAnswers2).toHaveProperty('title', {
        text: 'Food'
      })
    })

    it('should add summary list for each section', () => {
      expect(summaryViewModel.checkAnswers).toHaveLength(2)

      const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

      const { summaryList: summaryList1 } = checkAnswers1
      const { summaryList: summaryList2 } = checkAnswers2

      expect(summaryList1).toHaveProperty('rows', [
        {
          key: {
            text: keys[2]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[0]
          },
          actions: {
            items: [
              {
                classes: 'govuk-link--no-visited-state',
                href: `${basePath}/delivery-or-collection?returnUrl=${encodeURIComponent(`${basePath}/summary`)}`,
                text: 'Change',
                visuallyHiddenText: keys[0]
              }
            ]
          }
        }
      ])

      expect(summaryList2).toHaveProperty('rows', [
        {
          key: {
            text: keys[1]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[1]
          },
          actions: {
            items: [
              {
                classes: 'govuk-link--no-visited-state',
                href: `${basePath}/pizza-order/summary?returnUrl=${encodeURIComponent(`${basePath}/summary`)}`,
                text: 'Change',
                visuallyHiddenText: 'Pizza'
              }
            ]
          }
        }
      ])
    })

    it('should add summary list for each section (preview URL direct access)', () => {
      request.query.force = '' // Preview URL '?force'
      context = model.getFormContext(request, state)
      summaryViewModel = new SummaryViewModel(request, page, context)

      expect(summaryViewModel.checkAnswers).toHaveLength(2)

      const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

      const { summaryList: summaryList1 } = checkAnswers1
      const { summaryList: summaryList2 } = checkAnswers2

      expect(summaryList1).toHaveProperty('rows', [
        {
          key: {
            text: keys[2]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[0]
          },
          actions: {
            items: []
          }
        }
      ])

      expect(summaryList2).toHaveProperty('rows', [
        {
          key: {
            text: keys[1]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[1]
          },
          actions: {
            items: []
          }
        }
      ])
    })

    it('should use correct summary labels', () => {
      request.query.force = '' // Preview URL '?force'
      context = model.getFormContext(request, state)
      summaryViewModel = new SummaryViewModel(request, page, context)

      expect(summaryViewModel.details).toHaveLength(2)

      const [details1, details2] = summaryViewModel.details

      expect(details1.items[0]).toMatchObject({
        title: keys[2],
        label: keys[0]
      })

      expect(details2.items[0]).toMatchObject({
        title: keys[1],
        label: keys[4]
      })
    })
  })
})

describe('SummaryPageController', () => {
  let model: FormModel
  let controller: SummaryPageController
  let request: FormContextRequest

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: `${FORM_PREFIX}/test`
    })

    controller = new SummaryPageController(model, definition.pages[2])

    request = {
      method: 'get',
      url: new URL('http://example.com/repeat/pizza-order/summary'),
      path: '/repeat/pizza-order/summary',
      params: {
        path: 'pizza-order',
        slug: 'repeat'
      },
      query: {},
      app: { model },
      server: serverWithSaveAndReturn
    }
  })

  describe('Save and Return functionality', () => {
    it('should show save and return button on summary page', () => {
      expect(controller.shouldShowSaveAndReturn(request.server)).toBe(true)
    })

    it('should handle save and return from summary page', () => {
      const state: FormState = {
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      }

      const context = model.getFormContext(request, state)
      const viewModel = controller.getViewModel(request, context)

      expect(viewModel).toHaveProperty('allowSaveAndReturn', true)
    })

    it('should display correct page title', () => {
      const state: FormState = {
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      }

      const context = model.getFormContext(request, state)
      const viewModel = controller.getViewModel(request, context)

      expect(viewModel.pageTitle).toBe('Check your answers')
    })
  })
})
