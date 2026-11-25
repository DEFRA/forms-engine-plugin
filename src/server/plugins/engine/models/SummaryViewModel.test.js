import { FORM_PREFIX } from '~/src/server/constants.js'
import {
  FormModel,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import { SummaryPageController } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { serverWithSaveAndExit } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import { createPage } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import v2Definition from '~/test/form/definitions/conditions-relative-dates-v2.js'
import definition from '~/test/form/definitions/repeat-mixed.js'
const basePath = `${FORM_PREFIX}/test`

describe('SummaryViewModel', () => {
  const itemId1 = 'abc-123'
  const itemId2 = 'xyz-987'

  /** @type {FormModel} */
  let model
  /** @type {PageControllerClass} */
  let page
  /** @type {URL} */
  let pageUrl
  /** @type {FormContextRequest} */
  let request
  /** @type {FormContext} */
  let context
  /** @type {SummaryViewModel} */
  let summaryViewModel

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
      state: /** @satisfies {FormState} */ ({
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      }),
      keys: [
        'How would you like to receive your pizza?',
        'Pizza',
        'How you would like to receive your pizza',
        'Pizza',
        'Pizza'
      ],
      values: ['Collection', 'Not provided'],
      answers: ['Collection', ''],
      names: ['orderType', 'pizza']
    },
    {
      description: '1 item',
      state: /** @satisfies {FormState} */ ({
        $$__referenceNumber: 'foobar',
        orderType: 'delivery',
        pizza: [
          {
            toppings: 'Ham',
            quantity: 2,
            itemId: itemId1
          }
        ]
      }),
      keys: [
        'How would you like to receive your pizza?',
        'Pizza',
        'How you would like to receive your pizza',
        'Pizza',
        'Pizza'
      ],
      values: ['Delivery', 'You have added 1 answer'],
      answers: ['Delivery', 'You have added 1 answer'],
      names: ['orderType', 'pizza']
    },
    {
      description: '2 items',
      state: /** @satisfies {FormState} */ ({
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
      }),
      keys: [
        'How would you like to receive your pizza?',
        'Pizza',
        'How you would like to receive your pizza',
        'Pizza',
        'Pizza'
      ],
      values: ['Delivery', 'You have added 2 answers'],
      answers: ['Delivery', 'You have added 2 answers'],
      names: ['orderType', 'pizza']
    }
  ])(
    'Check answers ($description)',
    ({ state, keys, values, names, answers }) => {
      beforeEach(() => {
        context = model.getFormContext(request, state)
        summaryViewModel = new SummaryViewModel(
          request,
          page,
          context,
          stubTranslator
        )
      })

      it('should add title for each section', () => {
        const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

        // 1st summary list has section title
        expect(checkAnswers1).toHaveProperty('title', {
          text: 'Food'
        })

        // 2nd summary list has no title (unsectioned questions at bottom)
        expect(checkAnswers2).toHaveProperty('title', undefined)
      })

      it('should add summary list for each section', () => {
        expect(summaryViewModel.checkAnswers).toHaveLength(2)

        const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

        const { summaryList: summaryList1 } = checkAnswers1
        const { summaryList: summaryList2 } = checkAnswers2

        // 1st summary list contains sectioned questions (Food section)
        expect(summaryList1).toHaveProperty('rows', [
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

        // 2nd summary list contains unsectioned questions (at bottom)
        expect(summaryList2).toHaveProperty('rows', [
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
      })

      it('should add summary list for each section (preview URL direct access)', () => {
        request.query.force = '' // Preview URL '?force'
        context = model.getFormContext(request, state)
        summaryViewModel = new SummaryViewModel(
          request,
          page,
          context,
          stubTranslator
        )

        expect(summaryViewModel.checkAnswers).toHaveLength(2)

        const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

        const { summaryList: summaryList1 } = checkAnswers1
        const { summaryList: summaryList2 } = checkAnswers2

        // 1st summary list contains sectioned questions (Food section)
        expect(summaryList1).toHaveProperty('rows', [
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

        // 2nd summary list contains unsectioned questions (at bottom)
        expect(summaryList2).toHaveProperty('rows', [
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
      })

      it('should use correct summary labels', () => {
        request.query.force = '' // Preview URL '?force'
        context = model.getFormContext(request, state)
        summaryViewModel = new SummaryViewModel(
          request,
          page,
          context,
          stubTranslator
        )

        expect(summaryViewModel.details).toHaveLength(2)

        const [details1, details2] = summaryViewModel.details

        // 1st details contains sectioned questions (Food section)
        expect(details1.items[0]).toMatchObject({
          name: names[1],
          value: answers[1],
          title: keys[1],
          label: keys[4]
        })

        // 2nd details contains unsectioned questions (at bottom)
        expect(details2.items[0]).toMatchObject({
          name: names[0],
          value: answers[0],
          title: keys[2],
          label: keys[0]
        })

        const snapshot = [
          {
            name: names[1],
            value: answers[1],
            title: keys[1],
            label: keys[4]
          },
          {
            name: names[0],
            value: answers[0],
            title: keys[2],
            label: keys[0]
          }
        ]

        expect(snapshot).toMatchSnapshot()
      })
    }
  )

  it('should use correct summary labels', () => {
    request.query.force = '' // Preview URL '?force'
    const state = /** @satisfies {FormState} */ ({
      $$__referenceNumber: 'foobar',
      orderType: 'collection',
      pizza: []
    })

    // Setup an optional question
    const definitionOptional = /** @type {FormDefinition} */ (
      structuredClone(definition)
    )
    const firstPage = /** @type {PageQuestion} */ (definitionOptional.pages[0])
    const firstComponent = /** @type {RadiosFieldComponent} */ (
      firstPage.components[0]
    )
    firstComponent.options.required = false

    const model = new FormModel(definitionOptional, {
      basePath: `${FORM_PREFIX}/test`
    })

    context = model.getFormContext(request, state)

    const page = createPage(model, definition.pages[2])

    summaryViewModel = new SummaryViewModel(
      request,
      page,
      context,
      stubTranslator
    )

    expect(summaryViewModel.details).toHaveLength(2)

    const [details1, details2] = summaryViewModel.details

    // 1st details contains sectioned questions (Food section)
    expect(details1.items[0]).toMatchObject({
      name: 'pizza',
      value: '',
      title: 'Pizza',
      label: 'Pizza'
    })

    // 2nd details contains unsectioned questions (at bottom)
    expect(details2.items[0]).toMatchObject({
      name: 'orderType',
      value: 'Collection',
      title: 'How you would like to receive your pizza (optional)',
      label: 'How would you like to receive your pizza?'
    })
  })
})

describe('SummaryViewModel with per-request Translator', () => {
  /** @type {FormModel} */
  let model
  /** @type {PageControllerClass} */
  let page
  /** @type {FormContextRequest} */
  let request
  /** @type {FormContext} */
  let context
  /** @type {Translator} */
  let mockTranslator

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: `${FORM_PREFIX}/test`
    })

    page = createPage(model, definition.pages[2])
    const pageUrl = new URL('http://example.com/repeat/pizza-order/summary')

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

    mockTranslator = {
      t: jest.fn().mockReturnValue('mocked'),
      tPage: /** @type {Translator['tPage']} */ (
        jest.fn().mockReturnValue('mocked-content')
      ),
      tComponent: /** @type {Translator['tComponent']} */ (
        jest.fn().mockReturnValue('mocked-content')
      ),
      tSection: /** @type {Translator['tSection']} */ (
        jest.fn().mockReturnValue('mocked-content')
      ),
      tListItem: /** @type {Translator['tListItem']} */ (
        jest.fn().mockReturnValue('mocked-content')
      ),
      tForm: /** @type {Translator['tForm']} */ (
        jest.fn().mockReturnValue('mocked-content')
      ),
      language: 'en-GB'
    }
  })

  it('should use the provided translator t function for plugin keys like pages.summary.change', () => {
    /** @type {FormState} */
    const state = {
      $$__referenceNumber: 'foobar',
      orderType: 'collection',
      pizza: []
    }

    context = model.getFormContext(request, state)
    const viewModel = new SummaryViewModel(
      request,
      page,
      context,
      mockTranslator
    )
    expect(viewModel).toBeDefined()

    expect(mockTranslator.t).toHaveBeenCalledWith('pages.summary.change')
  })

  it('should use the provided translator t function for pages.summary.notProvided', () => {
    /** @type {FormState} */
    const state = {
      $$__referenceNumber: 'foobar',
      orderType: 'collection',
      pizza: []
    }

    context = model.getFormContext(request, state)
    const viewModel = new SummaryViewModel(
      request,
      page,
      context,
      mockTranslator
    )
    expect(viewModel).toBeDefined()

    expect(mockTranslator.t).toHaveBeenCalledWith('pages.summary.notProvided')
  })

  it('should use stubTranslator when no specific translation assertions needed', () => {
    /** @type {FormState} */
    const state = {
      $$__referenceNumber: 'foobar',
      orderType: 'collection',
      pizza: []
    }

    context = model.getFormContext(request, state)
    const viewModel = new SummaryViewModel(
      request,
      page,
      context,
      stubTranslator
    )
    expect(viewModel).toBeDefined()
  })
})

describe('SummaryPageController', () => {
  /** @type {FormModel} */
  let model
  /** @type {SummaryPageController} */
  let controller
  /** @type {FormContextRequest} */
  let request

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
      server: serverWithSaveAndExit
    }
  })

  describe('Save and Exit functionality', () => {
    it('should show save and exit button on summary page', () => {
      expect(controller.shouldShowSaveAndExit(request.server)).toBe(true)
    })

    it('should handle save and exit from summary page', () => {
      /** @type {FormState} */
      const state = {
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      }

      const context = model.getFormContext(request, state)
      const viewModel = controller.getViewModel(
        request,
        context,
        stubTranslator
      )

      expect(viewModel).toHaveProperty('allowSaveAndExit', true)
    })

    it('should display correct page title for v1 form', () => {
      /** @type {FormState} */
      const state = {
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      }

      const context = model.getFormContext(request, state)
      const viewModel = controller.getSummaryViewModel(
        request,
        context,
        stubTranslator
      )

      expect(viewModel.pageTitle).toBe(
        'Check your answers before sending your form'
      )
    })

    it('should display default page title for v2 form when title not provided', () => {
      /** @type {FormState} */
      const state = {
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      }

      const titleModel = new FormModel(v2Definition, {
        basePath: `${FORM_PREFIX}/test`
      })

      controller = new SummaryPageController(titleModel, v2Definition.pages[5])

      request = {
        method: 'get',
        url: new URL('http://example.com/repeat/pizza-order/summary'),
        path: '/test/summary',
        params: {
          path: 'summary',
          slug: 'test'
        },
        query: {},
        app: { model: titleModel },
        server: serverWithSaveAndExit
      }

      const context = titleModel.getFormContext(request, state)
      const viewModel = controller.getSummaryViewModel(
        request,
        context,
        stubTranslator
      )

      expect(viewModel.pageTitle).toBe(
        'Check your answers before sending your form'
      )
    })

    it('should display override page title for v2 form when title supplied', () => {
      /** @type {FormState} */
      const state = {
        $$__referenceNumber: 'foobar',
        orderType: 'collection',
        pizza: []
      }

      const v2DefinitionWithSummaryTitle = structuredClone(v2Definition)
      const summaryPage = v2DefinitionWithSummaryTitle.pages[5]
      summaryPage.title = 'Override summary title'

      const titleModel = new FormModel(v2DefinitionWithSummaryTitle, {
        basePath: `${FORM_PREFIX}/test`
      })

      controller = new SummaryPageController(titleModel, summaryPage)

      request = {
        method: 'get',
        url: new URL('http://example.com/repeat/pizza-order/summary'),
        path: '/test/summary',
        params: {
          path: 'summary',
          slug: 'test'
        },
        query: {},
        app: { model: titleModel },
        server: serverWithSaveAndExit
      }

      const context = titleModel.getFormContext(request, state)
      const viewModel = controller.getSummaryViewModel(
        request,
        context,
        stubTranslator
      )

      expect(viewModel.pageTitle).toBe('Override summary title')
    })
  })
})

/**
 * @import { FormDefinition, PageQuestion, RadiosFieldComponent } from '@defra/forms-model'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { FormContext, FormContextRequest, FormState } from '~/src/server/plugins/engine/types.js'
 */
