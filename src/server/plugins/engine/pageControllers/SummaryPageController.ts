import {
  hasComponentsEvenIfNoNext,
  type Page,
  type SubmitPayload
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit, type RouteOptions } from '@hapi/hapi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FileUploadField } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers.js'
import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  getCacheService
} from '~/src/server/plugins/engine/helpers.js'
import {
  SummaryViewModel,
  type FormModel
} from '~/src/server/plugins/engine/models/index.js'
import {
  type Detail,
  type DetailItem
} from '~/src/server/plugins/engine/models/types.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs
} from '~/src/server/routes/types.js'

export class SummaryPageController extends QuestionPageController {
  declare pageDef: Page

  /**
   * The controller which is used when Page["controller"] is defined as "./pages/summary.js"
   */

  constructor(model: FormModel, pageDef: Page) {
    super(model, pageDef)
    this.viewName = 'summary'

    // Components collection
    this.collection = new ComponentCollection(
      hasComponentsEvenIfNoNext(pageDef) ? pageDef.components : [],
      { model, page: this }
    )
  }

  getSummaryViewModel(
    request: FormContextRequest,
    context: FormContext
  ): SummaryViewModel {
    const viewModel = new SummaryViewModel(request, this, context)

    const { query } = request
    const { payload, errors } = context
    const components = this.collection.getViewModel(payload, errors, query)

    // We already figure these out in the base page controller. Take them and apply them to our page-specific model.
    // This is a stop-gap until we can add proper inheritance in place.
    viewModel.backLink = this.getBackLink(request, context)
    viewModel.feedbackLink = this.feedbackLink
    viewModel.phaseTag = this.phaseTag
    viewModel.components = components
    viewModel.allowSaveAndReturn = this.shouldShowSaveAndReturn(request.server)

    return viewModel
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a GET request at `/{id}/{path*}`,
   */
  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { viewName } = this

      const viewModel = this.getSummaryViewModel(request, context)

      viewModel.hasMissingNotificationEmail =
        await this.hasMissingNotificationEmail(request, context)

      return h.view(viewName, viewModel)
    }
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model } = this
      const { params } = request
      const cacheService = getCacheService(request.server)

      const { formsService } = this.model.services
      const { getFormMetadata } = formsService

      // Get the form metadata using the `slug` param
      const { notificationEmail } = await getFormMetadata(params.slug)
      const { isPreview } = checkFormStatus(request.params)
      const emailAddress = notificationEmail ?? this.model.def.outputEmail

      checkEmailAddressForLiveFormSubmission(emailAddress, isPreview)

      // Send submission email
      if (emailAddress) {
        const viewModel = this.getSummaryViewModel(request, context)
        await submitForm(context, request, viewModel, model, emailAddress)
      }

      await cacheService.setConfirmationState(request, { confirmed: true })

      // Clear all form data
      await cacheService.clearState(request)

      return this.proceed(request, h, this.getStatusPath())
    }
  }

  get postRouteOptions(): RouteOptions<FormRequestPayloadRefs> {
    return {
      ext: {
        onPreHandler: {
          method(request, h) {
            return h.continue
          }
        }
      }
    }
  }
}

async function submitForm(
  context: FormContext,
  request: FormRequestPayload,
  summaryViewModel: SummaryViewModel,
  model: FormModel,
  emailAddress: string
) {
  await extendFileRetention(model, context.state, emailAddress)

  const formStatus = checkFormStatus(request.params)
  const logTags = ['submit', 'submissionApi']

  request.logger.info(logTags, 'Preparing email', formStatus)

  // Get detail items
  const items = getFormSubmissionData(
    summaryViewModel.context,
    summaryViewModel.details
  )

  // Submit data
  request.logger.info(logTags, 'Submitting data')
  const submitResponse = await submitData(
    model,
    items,
    emailAddress,
    request.yar.id
  )

  if (submitResponse === undefined) {
    throw Boom.badRequest('Unexpected empty response from submit api')
  }

  return model.services.outputService.submit(
    context,
    request,
    model,
    emailAddress,
    items,
    submitResponse
  )
}

async function extendFileRetention(
  model: FormModel,
  state: FormSubmissionState,
  updatedRetrievalKey: string
) {
  const { formSubmissionService } = model.services
  const { persistFiles } = formSubmissionService
  const files: { fileId: string; initiatedRetrievalKey: string }[] = []

  // For each file upload component with files in
  // state, add the files to the batch getting persisted
  model.pages.forEach((page) => {
    const fileUploadComponents = page.collection.fields.filter(
      (component) => component instanceof FileUploadField
    )

    fileUploadComponents.forEach((component) => {
      const values = component.getFormValueFromState(state)
      if (!values?.length) {
        return
      }

      files.push(
        ...values.map(({ status }) => ({
          fileId: status.form.file.fileId,
          initiatedRetrievalKey: status.metadata.retrievalKey
        }))
      )
    })
  })

  if (files.length) {
    return persistFiles(files, updatedRetrievalKey)
  }
}

function submitData(
  model: FormModel,
  items: DetailItem[],
  retrievalKey: string,
  sessionId: string
) {
  const { formSubmissionService } = model.services
  const { submit } = formSubmissionService

  const payload: SubmitPayload = {
    sessionId,
    retrievalKey,

    // Main form answers
    main: items
      .filter((item) => 'field' in item)
      .map((item) => ({
        name: item.name,
        title: item.label,
        value: getAnswer(item.field, item.state, { format: 'data' })
      })),

    // Repeater form answers
    repeaters: items
      .filter((item) => 'subItems' in item)
      .map((item) => ({
        name: item.name,
        title: item.label,

        // Repeater item values
        value: item.subItems.map((detailItems) =>
          detailItems.map((subItem) => ({
            name: subItem.name,
            title: subItem.label,
            value: getAnswer(subItem.field, subItem.state, { format: 'data' })
          }))
        )
      }))
  }

  return submit(payload)
}

export function getFormSubmissionData(context: FormContext, details: Detail[]) {
  return context.relevantPages
    .map(({ href }) =>
      details.flatMap(({ items }) =>
        items.filter(({ page }) => page.href === href)
      )
    )
    .flat()
}
