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
import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
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
  type DetailItem,
  type DetailItemField
} from '~/src/server/plugins/engine/models/types.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  InvalidComponentStateError,
  PostPaymentSubmissionError
} from '~/src/server/plugins/engine/pageControllers/errors.js'
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
    const { payload, errors, state } = context
    const components = this.collection.getViewModel(payload, errors, query)

    // We already figure these out in the base page controller. Take them and apply them to our page-specific model.
    // This is a stop-gap until we can add proper inheritance in place.
    viewModel.backLink = this.getBackLink(request, context)
    viewModel.feedbackLink = this.feedbackLink
    viewModel.phaseTag = this.phaseTag
    viewModel.components = components
    viewModel.allowSaveAndExit = this.shouldShowSaveAndExit(request.server)
    viewModel.errors = errors

    // Find PaymentField and extract payment state for the summary banner
    const paymentField = context.relevantPages
      .flatMap((page) => page.collection.fields)
      .find((field): field is PaymentField => field instanceof PaymentField)

    if (paymentField) {
      const paymentState = paymentField.getPaymentStateFromState(state)
      if (paymentState) {
        viewModel.paymentState = paymentState
        viewModel.paymentDetails = this.buildPaymentDetails(
          paymentField,
          paymentState
        )
      }
    }

    return viewModel
  }

  private buildPaymentDetails(
    paymentField: PaymentField,
    paymentState: NonNullable<
      ReturnType<PaymentField['getPaymentStateFromState']>
    >
  ) {
    const formatDate = (isoString: string) => {
      const date = new Date(isoString)
      return (
        date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) +
        ' – ' +
        date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      )
    }

    const rows = [
      {
        key: { text: 'Payment for' },
        value: { text: paymentState.description }
      },
      {
        key: { text: 'Total amount' },
        value: { text: `£${paymentState.amount}` }
      },
      {
        key: { text: 'Reference' },
        value: { text: paymentState.reference }
      }
    ]

    if (paymentState.preAuth?.createdAt) {
      rows.push({
        key: { text: 'Date details were entered' },
        value: { text: formatDate(paymentState.preAuth.createdAt) }
      })
    }

    return {
      title: { text: 'Payment details' },
      summaryList: { rows }
    }
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

    checkEmailAddressForLiveFormSubmission(notificationEmail, isPreview)

    // Send submission email
    if (notificationEmail) {
      const viewModel = this.getSummaryViewModel(request, context)

      try {
        await submitForm(
          context,
          formMetadata,
          request,
          viewModel,
          model,
          notificationEmail,
          formMetadata
        )
      } catch (error) {
        if (error instanceof InvalidComponentStateError) {
          const govukError = createError(
            error.component.name,
            error.userMessage
          )

          request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

          if (error.shouldResetState) {
            // Reset state and redirect to component page (e.g., payment expired)
            await cacheService.resetComponentStates(
              request,
              error.getStateKeys()
            )
            return this.proceed(request, h, error.component.page?.path)
          }

          // Stay on CYA page with error (e.g., capture failed, user can retry)
          return this.proceed(request, h)
        }

        if (error instanceof PostPaymentSubmissionError) {
          const helpLink = error.helpLink
            ? ` or you can <a href="${error.helpLink}" target="_blank" rel="noopener noreferrer" class="govuk-link">contact us (opens in new tab)</a> and quote your reference number to arrange a refund`
            : ''

          const govukError = createError(
            'submission',
            `There was a problem and your form was not submitted. Try submitting the form again${helpLink}.`
          )

          request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

          return this.proceed(request, h)
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

  // Check if payment was captured (for Flow 9 error handling)
  const paymentWasCaptured = hasPaymentBeenCaptured(context)

  const formStatus = checkFormStatus(request.params)
  const logTags = ['submit', 'submissionApi']

  request.logger.info(logTags, 'Preparing email', formStatus)

  // Get detail items
  const items = getFormSubmissionData(
    summaryViewModel.context,
    summaryViewModel.details
  )

  try {
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

    await model.services.outputService.submit(
      context,
      request,
      model,
      emailAddress,
      items,
      submitResponse,
      formMetadata
    )
  } catch (err) {
    if (paymentWasCaptured) {
      throw new PostPaymentSubmissionError(
        context.referenceNumber,
        formMetadata.contact?.online?.url
      )
    }
    throw err
  }
}

/**
 * Checks if any payment component has been captured
 */
function hasPaymentBeenCaptured(context: FormContext): boolean {
  for (const page of context.relevantPages) {
    for (const field of page.collection.fields) {
      if (field instanceof PaymentField) {
        const paymentState = field.getPaymentStateFromState(context.state)
        if (paymentState?.capture?.status === 'success') {
          return true
        }
      }
    }
  }
  return false
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
  const relevantFields = context.relevantPages.flatMap(
    (page) => page.collection.fields
  )

  for (const component of relevantFields) {
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
  const items = context.relevantPages
    .map(({ href }) =>
      details.flatMap(({ items }) =>
        items.filter(({ page }) => page.href === href)
      )
    )
    .flat()

  // Add payment field items (excluded from details for UI but needed for submission)
  const paymentItems = getPaymentFieldItems(context)

  return [...items, ...paymentItems]
}

/**
 * Gets DetailItems for PaymentField components
 * PaymentField is excluded from summaryDetails for UI but needs to be in submission data
 */
function getPaymentFieldItems(context: FormContext): DetailItemField[] {
  const items: DetailItemField[] = []

  for (const page of context.relevantPages) {
    for (const field of page.collection.fields) {
      if (field instanceof PaymentField) {
        items.push({
          name: field.name,
          page,
          title: field.title,
          label: field.label,
          field,
          state: context.state,
          href: page.href,
          value: field.getDisplayStringFromState(context.state)
        })
      }
    }
  }

  return items
}
