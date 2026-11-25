import { randomUUID } from 'node:crypto'

import { ComponentType } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  ItemField,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/SummaryViewModel.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { StartPageController } from '~/src/server/plugins/engine/pageControllers/StartPageController.js'
import { getFormSubmissionData } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { PaymentSubmissionError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import basicDefinition from '~/test/form/definitions/basic.js'
import fileUploadDefinition from '~/test/form/definitions/file-upload-basic.js'
import repeatDefinition from '~/test/form/definitions/repeat.js'

// A v4 caller passes no translator. Page controller methods then use
// `context.translator`, and English when the context has none. Each page gets
// an id and a Welsh title, so that a page title shows the translator language.
/**
 * @param {FormDefinition} definition
 */
function welshModel(definition) {
  const pages = definition.pages.map((page) => ({
    ...page,
    id: randomUUID()
  }))

  return new FormModel(
    /** @type {FormDefinition} */ ({
      ...definition,
      pages,
      metadata: {
        translations: {
          cy: Object.fromEntries(
            pages.map(({ id, title }) => [
              `pages.${id}.title`,
              `Welsh ${title}`
            ])
          )
        }
      }
    }),
    { basePath: 'test' }
  )
}

/**
 * @param {string} path
 * @returns {FormContextRequest}
 */
function buildRequest(path, query = {}) {
  const url = new URL(`/test${path}`, 'http://example.com')

  return buildFormContextRequest({
    method: 'get',
    url,
    path: url.pathname,
    params: { path: path.split('/')[1], slug: 'test' },
    query,
    app: {}
  })
}

/**
 * @param {FormModel} model
 * @param {FormContextRequest} request
 * @param {FormSubmissionState} state
 */
function contexts(model, request, state) {
  return {
    welsh: model.getFormContext(
      request,
      state,
      undefined,
      model.createTranslator('cy')
    ),
    none: model.getFormContext(request, state)
  }
}

/**
 * @param {SummaryViewModel} param0
 */
function changeLinkText({ checkAnswers }) {
  return checkAnswers[0].summaryList.rows[0].actions?.items[0].text
}

class V4QuestionPageController extends QuestionPageController {
  /**
   * @param {FormContextRequest} request
   * @param {FormContext} context
   */
  backLink(request, context) {
    return this.getBackLink(request, context)
  }
}

describe('Page controller methods with no translator', () => {
  const state = {
    $$__referenceNumber: 'foobar',
    pizza: [{ itemId: 'abc-123', toppings: 'Ham', quantity: 2 }]
  }

  describe('repeat form', () => {
    const model = welshModel(repeatDefinition)
    const [repeat, summary] =
      /** @type {[RepeatPageController, SummaryPageController]} */ (model.pages)

    it('RepeatPageController.getViewModel', () => {
      const request = buildRequest('/pizza-order')
      const { welsh, none } = contexts(model, request, state)

      expect(repeat.getViewModel(request, welsh).pageTitle).toBe(
        'Welsh Pizza order'
      )
      expect(repeat.getViewModel(request, none).pageTitle).toBe('Pizza order')
    })

    it('RepeatPageController.getListSummaryViewModel', () => {
      const request = buildRequest('/pizza-order/summary')
      const { welsh, none } = contexts(model, request, state)

      expect(
        repeat.getListSummaryViewModel(request, welsh, state.pizza).pageTitle
      ).toBe('Rydych wedi ychwanegu 1 ateb')
      expect(
        repeat.getListSummaryViewModel(request, none, state.pizza).pageTitle
      ).toBe('You have added 1 answer')
    })

    it('QuestionPageController.getBackLink', () => {
      const controller = new V4QuestionPageController(model, repeat.pageDef)
      const request = buildRequest('/pizza-order', { returnUrl: '/summary' })
      const { welsh, none } = contexts(model, request, state)

      expect(controller.backLink(request, welsh)?.text).toBe(
        "Ewch yn ôl i wirio'ch atebion"
      )
      expect(controller.backLink(request, none)?.text).toBe(
        'Go back to check answers'
      )
    })

    it('SummaryPageController.getSummaryViewModel', () => {
      const request = buildRequest('/summary')
      const { welsh, none } = contexts(model, request, state)

      expect(changeLinkText(summary.getSummaryViewModel(request, welsh))).toBe(
        'Newid'
      )
      expect(changeLinkText(summary.getSummaryViewModel(request, none))).toBe(
        'Change'
      )
    })

    it('SummaryViewModel and getFormSubmissionData', () => {
      const request = buildRequest('/summary')
      const { welsh, none } = contexts(model, request, state)
      const viewModel = new SummaryViewModel(request, summary, none)

      expect(
        changeLinkText(new SummaryViewModel(request, summary, welsh))
      ).toBe('Newid')
      expect(changeLinkText(viewModel)).toBe('Change')
      expect(
        getFormSubmissionData(none, viewModel.details, model)[0].label
      ).toBe('Pizza')
    })

    it('ItemField', () => {
      const [field] = repeat.collection.fields

      expect(
        ItemField(repeat, { toppings: 'Ham' }, field, { path: '/pizza-order' })
          .label
      ).toBe('Toppings')
    })
  })

  it('StartPageController.getViewModel', () => {
    const model = welshModel(basicDefinition)
    const controller = new StartPageController(model, {
      ...model.def.pages[0],
      // @ts-expect-error - a start page uses the start controller
      controller: 'StartPageController'
    })
    const request = buildRequest(basicDefinition.pages[0].path)
    const { welsh, none } = contexts(model, request, state)
    const formRequest = /** @type {FormRequest} */ (
      /** @type {unknown} */ (request)
    )

    expect(controller.getViewModel(formRequest, welsh).pageTitle).toBe(
      'Welsh Buy a rod fishing licence'
    )
    expect(controller.getViewModel(formRequest, none).pageTitle).toBe(
      'Buy a rod fishing licence'
    )
  })

  it('FileUploadPageController.getViewModel', () => {
    const model = welshModel(fileUploadDefinition)
    const [controller] = /** @type {[FileUploadPageController]} */ (model.pages)
    const request = buildRequest(controller.path)
    const uploadState = /** @type {FormSubmissionState} */ (
      /** @type {unknown} */ ({
        ...state,
        upload: {
          [controller.path]: {
            upload: { uploadId: 'id', uploadUrl: 'url', statusUrl: 'url' },
            files: []
          }
        }
      })
    )
    const { welsh, none } = contexts(model, request, uploadState)

    expect(controller.getViewModel(request, welsh).pageTitle).toBe(
      'Welsh File upload component'
    )
    expect(controller.getViewModel(request, none).pageTitle).toBe(
      'File upload component'
    )
  })

  it('PaymentSubmissionError.checkPaymentAmount', () => {
    const model = welshModel(basicDefinition)
    const [component] = /** @type {FormComponent[]} */ (
      new ComponentCollection(
        [
          {
            title: 'Payment',
            name: 'payment',
            type: ComponentType.PaymentField,
            options: { amount: 100, description: 'Licence fee' }
          }
        ],
        { model }
      ).fields
    )

    expect(() =>
      PaymentSubmissionError.checkPaymentAmount(500, 100, component)
    ).toThrow(
      expect.objectContaining({
        userMessage:
          'The pre-authorised payment amount is somehow different from that requested. Try adding payment details again.'
      })
    )
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
 * @import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
 * @import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
 * @import { SummaryPageController } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
 * @import { FormContext, FormContextRequest, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest } from '~/src/server/routes/types.js'
 */
