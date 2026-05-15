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
 * calls getViewModel (or an optional invoke callback) with a minimal mock
 * request/context. The controller handles showTitle, label sizing,
 * isPageHeading, allowContinue, and viewName automatically.
 * @param {object} pageDef - Page definition for the preview page
 * @param {object} [options]
 * @param {object} [options.state] - Form state passed as both payload and state
 * @param {object[]} [options.additionalPageDefs] - Extra page defs to include before pageDef (e.g. question pages before a summary)
 * @param {(controller: object, model: object, request: object, context: object) => object} [options.invoke] - Override which method to call; defaults to getViewModel
 * @returns {object}
 */
function pageViewContext(
  pageDef,
  { state = {}, payload, additionalPageDefs = [], invoke } = {}
) {
  const isSummary = pageDef.controller === 'SummaryPageController'
  const allPageDefs = [
    ...additionalPageDefs,
    pageDef,
    ...(isSummary ? [] : [SUMMARY_PAGE_DEF])
  ]
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
  const controller = model.pages[additionalPageDefs.length]
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
  /** @type {import('~/src/server/plugins/engine/types.js').FormContextRequest} */
  const mockRequest = {
    query: { force: 'true' },
    params: {},
    path: pageDef.path,
    url: { search: '?force=true' },
    server: { plugins: { 'forms-engine-plugin': {} } }
  }
  return invoke
    ? invoke(controller, model, mockRequest, mockContext)
    : controller.getViewModel(mockRequest, mockContext)
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
    context: pageViewContext(
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
      },
      {
        invoke: (ctrl, _model, req, ctx) => {
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
      }
    )
  },

  FileUploadPageController: {
    exampleComponents: [componentFixtures['FileUploadField'].variants[0].def],
    variants: [
      {
        label: 'No files uploaded',
        context: pageViewContext(
          {
            path: '/upload',
            controller: 'FileUploadPageController',
            title: 'Upload a document',
            components: [componentFixtures['FileUploadField'].variants[0].def]
          },
          {
            state: {
              upload: {
                '/upload': { upload: { uploadUrl: 'preview' }, files: [] }
              }
            }
          }
        )
      },
      {
        label: 'With files uploaded',
        context: pageViewContext(
          {
            path: '/upload',
            controller: 'FileUploadPageController',
            title: 'Upload a document',
            components: [componentFixtures['FileUploadField'].variants[0].def]
          },
          {
            state: {
              upload: {
                '/upload': { upload: { uploadUrl: 'preview' }, files: [] }
              }
            },
            payload: componentFixtures['FileUploadField'].variants.find(
              (v) => v.label === 'With files uploaded'
            ).payload
          }
        )
      }
    ]
  },

  SummaryPageController: {
    context: pageViewContext(
      {
        path: '/summary',
        controller: 'SummaryPageController',
        title: 'Check your answers',
        components: []
      },
      {
        additionalPageDefs: [
          {
            path: '/name',
            title: 'Full name',
            components: [
              {
                type: 'TextField',
                name: 'fullname',
                title: 'Full name',
                options: {},
                schema: {}
              }
            ]
          },
          {
            path: '/email',
            title: 'Email',
            components: [
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
        state: { fullname: 'Sarah Phillips', email: 'sarah@example.gov.uk' },
        invoke: (ctrl, _model, req, ctx) => ctrl.getSummaryViewModel(req, ctx)
      }
    )
  }
}
