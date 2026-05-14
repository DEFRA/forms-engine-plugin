import { Engine } from '@defra/forms-model'

import { FormModel } from '../.server/server/plugins/engine/models/FormModel.js'

import { fixtures as componentFixtures } from './component-preview-fixtures.js'

import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.js'

/**
 * Builds a component view model from the named component fixture so page
 * fixtures can reuse the same data as component previews without duplicating
 * component definitions. Supports variant fixtures — pass a label to select
 * a specific variant, or omit it to use the first (or only) variant.
 * @param {string} name - e.g. 'FileUploadField'
 * @param {string} [variantLabel] - e.g. 'No files uploaded'
 * @returns {{ type: string, model: object }}
 */
function componentViewModel(name, variantLabel) {
  const fixture = componentFixtures[name]
  const variant = fixture.variants
    ? (fixture.variants.find((v) => v.label === variantLabel) ??
      fixture.variants[0])
    : fixture
  const component = createComponent(variant.def, { model: variant.model })
  return {
    type: variant.def.type,
    model: component.getViewModel(variant.payload, [])
  }
}

/**
 * Instantiates the real page controller for the given page definition and
 * calls getViewModel with a minimal mock request/context. The controller
 * handles showTitle, label sizing, isPageHeading, allowContinue, and viewName
 * automatically — no manual fixture properties needed for these.
 * @param {object} pageDef - Page definition (path, title, controller, components)
 * @param {object} [state] - Optional form state to pass as the payload
 * @returns {object}
 */
function pageViewContext(pageDef, state = {}) {
  const model = new FormModel(
    {
      name: 'preview',
      schema: 2,
      engine: Engine.V2,
      startPage: pageDef.path,
      sections: [],
      conditions: [],
      lists: [],
      pages: [
        pageDef,
        {
          path: '/summary',
          controller: 'SummaryPageController',
          title: 'Check your answers',
          components: []
        }
      ]
    },
    { basePath: '/preview' }
  )
  const [controller] = model.pages
  const mockContext = {
    payload: state,
    errors: undefined,
    evaluationState: {},
    paths: [],
    state,
    isForceAccess: true
  }
  /** @type {import('~/src/server/plugins/engine/types.js').FormContextRequest} */
  const mockRequest = {
    query: { force: 'true' },
    params: {},
    path: pageDef.path,
    url: { search: '?force=true' },
    server: { plugins: { 'forms-engine-plugin': {} } }
  }
  return controller.getViewModel(mockRequest, mockContext)
}

/** @type {Record<string, { context?: object, variants?: Array<{label: string, context: object}> }>} */
export const pageFixtures = {
  PageController: {
    variants: [
      {
        label: 'Single question',
        context: pageViewContext({
          path: '/pagepath',
          title: 'What is your full name?',
          components: [
            {
              type: 'TextField',
              name: 'fullname',
              title: 'What is your full name?',
              hint: 'As shown on your passport',
              options: {},
              schema: {}
            }
          ]
        })
      },
      {
        label: 'Multiple questions',
        context: pageViewContext({
          path: '/pagepath',
          title: 'Tell us about yourself',
          components: [
            {
              type: 'TextField',
              name: 'fullname',
              title: 'What is your full name?',
              options: {},
              schema: {}
            },
            {
              type: 'DatePartsField',
              name: 'dob',
              title: 'What is your date of birth?',
              hint: 'For example, 27 3 2007',
              options: {},
              schema: {}
            }
          ]
        })
      }
    ]
  },

  StartPageController: {
    context: pageViewContext({
      path: '/start',
      controller: 'StartPageController',
      title: 'Apply for a licence',
      components: []
    })
  },

  TerminalPageController: {
    context: pageViewContext({
      path: '/ineligible',
      controller: 'TerminalPageController',
      title: 'You are not eligible',
      components: [
        {
          type: 'Html',
          name: 'eligibility',
          content:
            '<p class="govuk-body">You do not meet the eligibility criteria for this service.</p>',
          options: {}
        }
      ]
    })
  },

  RepeatPageController: {
    context: {
      page: { viewName: 'repeat-list-summary' },
      pageTitle: 'Add members of your household',
      showTitle: true,
      allowSaveAndExit: false,
      checkAnswers: [
        {
          summaryList: {
            rows: [
              {
                key: { text: 'Full name' },
                value: { text: 'Sarah Phillips' },
                actions: { items: [{ href: '#', text: 'Remove' }] }
              },
              {
                key: { text: 'Full name' },
                value: { text: 'David Jones' },
                actions: { items: [{ href: '#', text: 'Remove' }] }
              },
              {
                key: { text: 'Full name' },
                value: { text: 'Emma Wilson' },
                actions: { items: [{ href: '#', text: 'Remove' }] }
              }
            ]
          }
        }
      ]
    }
  },

  FileUploadPageController: {
    exampleComponents: [
      {
        type: 'FileUploadField',
        name: 'upload',
        title: 'Upload a document',
        options: {},
        schema: {}
      }
    ],
    get variants() {
      return [
        {
          label: 'No files uploaded',
          context: {
            pageTitle: 'Upload a document',
            showTitle: true,
            formAction: 'preview',
            page: { viewName: 'file-upload', allowContinue: true },
            componentsBefore: [],
            components: [
              componentViewModel('FileUploadField', 'No files uploaded')
            ],
            formComponent: componentViewModel(
              'FileUploadField',
              'No files uploaded'
            )
          }
        },
        {
          label: 'With files uploaded',
          context: {
            pageTitle: 'Upload a document',
            showTitle: true,
            formAction: 'preview',
            page: { viewName: 'file-upload', allowContinue: true },
            componentsBefore: [],
            components: [
              componentViewModel('FileUploadField', 'With files uploaded')
            ],
            formComponent: componentViewModel(
              'FileUploadField',
              'With files uploaded'
            )
          }
        }
      ]
    }
  },

  SummaryPageController: {
    context: {
      page: { viewName: 'summary' },
      pageTitle: 'Check your answers',
      allowSaveAndExit: false,
      checkAnswers: [
        {
          summaryList: {
            rows: [
              {
                key: { text: 'Full name' },
                value: { text: 'Sarah Phillips' },
                actions: {
                  items: [
                    {
                      href: '#',
                      text: 'Change',
                      visuallyHiddenText: 'full name'
                    }
                  ]
                }
              },
              {
                key: { text: 'Email address' },
                value: { text: 'sarah@example.gov.uk' },
                actions: {
                  items: [
                    {
                      href: '#',
                      text: 'Change',
                      visuallyHiddenText: 'email address'
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  }
}
