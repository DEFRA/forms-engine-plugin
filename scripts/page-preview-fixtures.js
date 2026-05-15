import { ComponentType, ControllerType, Engine } from '@defra/forms-model'

import { FormModel } from '../.server/server/plugins/engine/models/FormModel.js'

import { fixtures as componentFixtures } from './component-preview-fixtures.js'

const SUMMARY_PAGE_DEF = {
  path: '/summary',
  controller: ControllerType.Summary,
  title: 'Check your answers',
  components: []
}

/**
 * Instantiates the real page controller for the given page definition and
 * calls getViewModel (or an optional override) with a minimal mock
 * request/context. The controller handles showTitle, label sizing,
 * isPageHeading, allowContinue, and viewName automatically.
 * @param {PageViewContextOptions} options
 * @returns {PageViewModel}
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

const fileUploadWithFilesVariant = componentFixtures[
  ComponentType.FileUploadField
].variants.find((v) => v.label === 'With files uploaded')

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
                  type: ComponentType.TextField,
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
                  type: ComponentType.TextField,
                  name: 'fullname',
                  title: 'What is your full name?',
                  options: {},
                  schema: {}
                },
                {
                  type: ComponentType.DatePartsField,
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
          controller: ControllerType.Start,
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
          controller: ControllerType.Terminal,
          title: 'You are not eligible',
          components: [
            {
              type: ComponentType.Html,
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
          controller: ControllerType.Repeat,
          title: 'People',
          repeat: {
            options: { name: 'people', title: 'Person' },
            schema: { min: 1, max: 25 }
          },
          components: [
            {
              type: ComponentType.TextField,
              name: 'fullname',
              title: 'Full name',
              options: {},
              schema: {}
            }
          ]
        }
      ],
      getViewModelOverride: (ctrl, _model, req, ctx) => {
        const repeat = /** @type {RepeatPageController} */ (ctrl)
        const vm = repeat.getListSummaryViewModel(req, ctx, [
          { itemId: '1', fullname: 'Sarah Phillips' },
          { itemId: '2', fullname: 'David Jones' },
          { itemId: '3', fullname: 'Emma Wilson' }
        ])
        return {
          ...vm,
          page: { ...vm.page, viewName: repeat.listSummaryViewName }
        }
      }
    })
  },

  FileUploadPageController: {
    exampleComponents: [fileUploadWithFilesVariant.def],
    variants: [
      {
        label: 'No files uploaded',
        context: pageViewContext({
          pages: [
            {
              path: '/upload',
              controller: ControllerType.FileUpload,
              title: 'Upload a document',
              components: [fileUploadWithFilesVariant.def]
            }
          ],
          state: /** @type {FormState} */ (
            /** @type {unknown} */ ({
              upload: {
                '/upload': { upload: { uploadUrl: 'preview' }, files: [] }
              }
            })
          )
        })
      },
      {
        label: 'With files uploaded',
        context: pageViewContext({
          pages: [
            {
              path: '/upload',
              controller: ControllerType.FileUpload,
              title: 'Upload a document',
              components: [fileUploadWithFilesVariant.def]
            }
          ],
          state: /** @type {FormState} */ (
            /** @type {unknown} */ ({
              upload: {
                '/upload': { upload: { uploadUrl: 'preview' }, files: [] }
              }
            })
          ),
          payload: fileUploadWithFilesVariant.payload
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
              type: ComponentType.TextField,
              name: 'fullname',
              title: 'Full name',
              options: {},
              schema: {}
            },
            {
              type: ComponentType.EmailAddressField,
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
      getViewModelOverride: (ctrl, _model, req, ctx) => {
        const summary = /** @type {SummaryPageController} */ (ctrl)
        return summary.getSummaryViewModel(req, ctx)
      }
    })
  }
}

/**
 * @typedef {import('@defra/forms-model').ComponentDef} ComponentDef
 * @typedef {import('@defra/forms-model').Page} Page
 * @typedef {import('~/src/server/plugins/engine/types.js').FormContext} FormContext
 * @typedef {import('~/src/server/plugins/engine/types.js').FormContextRequest} FormContextRequest
 * @typedef {import('~/src/server/plugins/engine/types.js').FormState} FormState
 * @typedef {import('~/src/server/plugins/engine/types.js').PageViewModel} PageViewModel
 * @typedef {import('~/src/server/plugins/engine/pageControllers/PageController.js').PageController} PageController
 * @typedef {import('~/src/server/plugins/engine/pageControllers/RepeatPageController.js').RepeatPageController} RepeatPageController
 * @typedef {import('~/src/server/plugins/engine/pageControllers/SummaryPageController.js').SummaryPageController} SummaryPageController
 * @typedef {{ label: string, context: PageViewModel }} PageFixtureVariant
 * @typedef {{ context?: PageViewModel, variants?: PageFixtureVariant[], exampleComponents?: ComponentDef[] }} PageFixture
 * @typedef {{ pages: Page[], renderPage?: string, state?: FormState, payload?: FormState, getViewModelOverride?: (controller: PageController, model: FormModel, request: FormContextRequest, context: FormContext) => PageViewModel }} PageViewContextOptions
 */
