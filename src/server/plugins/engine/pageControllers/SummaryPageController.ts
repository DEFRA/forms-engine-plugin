import {
  hasComponentsEvenIfNoNext,
  type FormMetadata,
  type Page,
  type SubmitPayload
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type RouteOptions } from '@hapi/hapi'

import { COMPONENT_STATE_ERROR } from '~/src/server/constants.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  createError,
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
import { InvalidComponentStateError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import {
  type FormConfirmationState,
  type FormContext,
  type FormContextRequest
} from '~/src/server/plugins/engine/types.js'
import {
  FormAction,
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'

export class SummaryPageController extends QuestionPageController {
  declare pageDef: Page
  allowSaveAndExit = true

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
    viewModel.allowSaveAndExit = this.shouldShowSaveAndExit(request.server)
    viewModel.errors = errors

    return viewModel
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a GET request at `/{id}/{path*}`,
   */
  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: FormResponseToolkit
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
      h: FormResponseToolkit
    ) => {
      // Check if this is a save-and-exit action
      const { action } = request.payload
      if (action === FormAction.SaveAndExit) {
        return this.handleSaveAndExit(request, context, h)
      }

      return this.handleFormSubmit(request, context, h)
    }
  }

  async handleFormSubmit(
    request: FormRequestPayload,
    context: FormContext,
    h: FormResponseToolkit
  ) {
    const { model } = this
    const { params } = request

    const cacheService = getCacheService(request.server)

    const { formsService } = this.model.services
    const { getFormMetadata } = formsService

    // Get the form metadata using the `slug` param
    const formMetadata = await getFormMetadata(params.slug)
    const { notificationEmail } = formMetadata
    const { isPreview } = checkFormStatus(request.params)
    const emailAddress = notificationEmail ?? this.model.def.outputEmail

    checkEmailAddressForLiveFormSubmission(emailAddress, isPreview)

    // Send submission email
    if (emailAddress) {
      const viewModel = this.getSummaryViewModel(request, context)

      try {
        await submitForm(
          context,
          formMetadata,
          request,
          viewModel,
          model,
          emailAddress,
          formMetadata
        )
      } catch (error) {
        if (error instanceof InvalidComponentStateError) {
          const govukError = createError(
            error.component.name,
            error.userMessage
          )

          request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

          await cacheService.resetComponentStates(request, error.getStateKeys())

          return this.proceed(request, h, error.component.page?.path)
        }

        throw error
      }
    }

    await cacheService.setConfirmationState(request, {
      confirmed: true,
      formId: context.state.formId
    } as FormConfirmationState)

    // Clear all form data
    await cacheService.clearState(request)

    return this.proceed(request, h, this.getStatusPath())
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

export async function submitForm(
  context: FormContext,
  metadata: FormMetadata,
  request: FormRequestPayload,
  summaryViewModel: SummaryViewModel,
  model: FormModel,
  emailAddress: string,
  formMetadata: FormMetadata
) {
  await finaliseComponents(request, metadata, context)

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
    submitResponse,
    formMetadata
  )
}

/**
 * Finalises any components that need post-processing before form submission. Candidates usually involve
 * those that have external state.
 * Examples include:
 * - file uploads which are 'persisted' before submission
 * - payments which are 'captured' before submission
 */
async function finaliseComponents(
  request: FormRequestPayload,
  metadata: FormMetadata,
  context: FormContext
) {
  const relevantPages = context.relevantPages.flatMap(
    (page) => page.collection.fields
  )

  for (const component of relevantPages) {
    /* 
      Each component will throw InvalidComponent if its state is invalid, which is handled
      by handleFormSubmit
    */
    await component.onSubmit(request, metadata, context)
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
