import { Engine } from '@defra/forms-model'

import { FormModel } from '../.server/server/plugins/engine/models/FormModel.js'

import { fixtures as componentFixtures } from './component-preview-fixtures.js'

const SUMMARY_PAGE_DEF = {
  path: '/summary',
  controller: 'SummaryPageController',
  title: 'Check your answers',
  components: []
}

/**
 * Instantiates the real page controller for the given page definition and
 * calls getViewModel (or an optional override) with a minimal mock
 * request/context. The controller handles showTitle, label sizing,
 * isPageHeading, allowContinue, and viewName automatically.
 * @param {object} options
 * @param {object[]} options.pages - All page defs; SUMMARY_PAGE_DEF is always appended automatically
 * @param {string} [options.renderPage] - Path of the page to render; defaults to pages[0].path
 * @param {object} [options.state] - Form state
 * @param {object} [options.payload] - Form payload; defaults to state
 * @param {(controller: object, model: object, request: object, context: object) => object} [options.getViewModelOverride] - Override which method to call; defaults to getViewModel
 * @returns {object}
 */
function pageViewContext({
  pages,
  renderPage = pages[0].path,
  state = {},
  payload,
  getViewModelOverride
}) {
  const allPageDefs = [...pages, SUMMARY_PAGE_DEF]
  const model = new FormModel(
    {
      name: 'preview',
      schema: 2,
      engine: Engine.V2,
      startPage: allPageDefs[0].path,
      sections: [],
      conditions: [],
      lists: [],
      pages: allPageDefs
    },
    { basePath: '/preview' }
  )
  const controller = model.pages.find((p) => p.path === renderPage)
  const mockContext = {
    payload: payload ?? state,
    errors: undefined,
    evaluationState: state,
    relevantState: state,
    paths: [],
    state,
    isForceAccess: false,
    relevantPages: model.pages.filter((p) => p.viewName !== 'summary')
  }
  /** @type {FormContextRequest} */
  const mockRequest = {
    query: {},
    params: {},
    path: renderPage,
    url: { search: '' },
    server: { plugins: { 'forms-engine-plugin': {} } }
  }
  return getViewModelOverride
    ? getViewModelOverride(controller, model, mockRequest, mockContext)
    : controller.getViewModel(mockRequest, mockContext)
}

const fileUploadDef = componentFixtures['FileUploadField'].variants[0].def
const fileUploadWithFilesPayload = componentFixtures[
  'FileUploadField'
].variants.find((v) => v.label === 'With files uploaded').payload

const fileUploadPageDef = {
  path: '/upload',
  controller: 'FileUploadPageController',
  title: 'Upload a document',
  components: [fileUploadDef]
}

const fileUploadState = {
  upload: {
    '/upload': { upload: { uploadUrl: 'preview' }, files: [] }
  }
}

/** @type {Record<string, PageFixture>} */
export const pageFixtures = {
  PageController: {
    variants: [
      {
        label: 'Single question',
        context: pageViewContext({
          pages: [
            {
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
            }
          ]
        })
      },
      {
        label: 'Multiple questions',
        context: pageViewContext({
          pages: [
            {
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
            }
          ]
        })
      }
    ]
  },

  StartPageController: {
    context: pageViewContext({
      pages: [
        {
          path: '/start',
          controller: 'StartPageController',
          title: 'Apply for a licence',
          components: []
        }
      ]
    })
  },

  TerminalPageController: {
    context: pageViewContext({
      pages: [
        {
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
        }
      ]
    })
  },

  RepeatPageController: {
    context: pageViewContext({
      pages: [
        {
          path: '/people',
          controller: 'RepeatPageController',
          title: 'People',
          repeat: {
            options: { name: 'people', title: 'Person' },
            schema: { min: 1, max: 25 }
          },
          components: [
            {
              type: 'TextField',
              name: 'fullname',
              title: 'Full name',
              options: {},
              schema: {}
            }
          ]
        }
      ],
      getViewModelOverride: (ctrl, _model, req, ctx) => {
        const vm = ctrl.getListSummaryViewModel(req, ctx, [
          { itemId: '1', fullname: 'Sarah Phillips' },
          { itemId: '2', fullname: 'David Jones' },
          { itemId: '3', fullname: 'Emma Wilson' }
        ])
        return {
          ...vm,
          page: { ...vm.page, viewName: ctrl.listSummaryViewName }
        }
      }
    })
  },

  FileUploadPageController: {
    exampleComponents: [fileUploadDef],
    variants: [
      {
        label: 'No files uploaded',
        context: pageViewContext({
          pages: [fileUploadPageDef],
          state: fileUploadState
        })
      },
      {
        label: 'With files uploaded',
        context: pageViewContext({
          pages: [fileUploadPageDef],
          state: fileUploadState,
          payload: fileUploadWithFilesPayload
        })
      }
    ]
  },

  SummaryPageController: {
    context: pageViewContext({
      pages: [
        {
          path: '/details',
          title: 'Your details',
          components: [
            {
              type: 'TextField',
              name: 'fullname',
              title: 'Full name',
              options: {},
              schema: {}
            },
            {
              type: 'EmailAddressField',
              name: 'email',
              title: 'Email address',
              options: {},
              schema: {}
            }
          ]
        }
      ],
      renderPage: '/summary',
      state: { fullname: 'Sarah Phillips', email: 'sarah@example.gov.uk' },
      getViewModelOverride: (ctrl, _model, req, ctx) =>
        ctrl.getSummaryViewModel(req, ctx)
    })
  }
}

/**
 * @typedef {import('~/src/server/plugins/engine/types.js').FormContextRequest} FormContextRequest
 * @typedef {{ context?: object, variants?: Array<{label: string, context: object}> }} PageFixture
 */
