import {
  hasComponentsEvenIfNoNext,
  type FormMetadata,
  type Page,
  type SubmitPayload
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type RouteOptions } from '@hapi/hapi'

import {
  COMPONENT_STATE_ERROR,
  PAYMENT_EXPIRED_NOTIFICATION
} from '~/src/server/constants.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
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
  buildMainRecords,
  buildRepeaterRecords
} from '~/src/server/plugins/engine/pageControllers/helpers/submission.js'
import {
  type FormConfirmationState,
  type FormContext,
  type FormContextRequest
} from '~/src/server/plugins/engine/types.js'
import {
  DEFAULT_PAYMENT_HELP_URL,
  formatPaymentAmount,
  formatPaymentDate
} from '~/src/server/plugins/payment/helper.js'
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

    const components = this.collection.getViewModel(payload, errors, query)

    viewModel.backLink = this.getBackLink(request, context)
    viewModel.feedbackLink = this.feedbackLink
    viewModel.phaseTag = this.phaseTag
    viewModel.components = components
    viewModel.allowSaveAndExit = this.shouldShowSaveAndExit(request.server)
    viewModel.errors = errors

    return viewModel
  }

  private buildPaymentDetails(
    paymentField: PaymentField,
    paymentState: NonNullable<
      ReturnType<PaymentField['getPaymentStateFromState']>
    >
  ) {
    const rows = [
      {
        key: { text: 'Payment for' },
        value: { text: paymentState.description }
      },
      {
        key: { text: 'Total amount' },
        value: { text: formatPaymentAmount(paymentState.amount) }
      },
      {
        key: { text: 'Reference' },
        value: { text: paymentState.reference }
      }
    ]

    if (paymentState.preAuth?.createdAt) {
      rows.push({
        key: { text: 'Date of payment' },
        value: { text: formatPaymentDate(paymentState.preAuth.createdAt) }
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

    const formMetadata = await getFormMetadata(params.slug)
    const { notificationEmail } = formMetadata
    const { isPreview } = checkFormStatus(request.params)

    checkEmailAddressForLiveFormSubmission(notificationEmail, isPreview)

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
        return this.handleSubmissionError(error, request, h)
      }
    }

    await cacheService.setConfirmationState(request, {
      confirmed: true,
      formId: context.state.formId,
      referenceNumber: context.referenceNumber
    } as FormConfirmationState)

    await cacheService.clearState(request)

    return this.proceed(request, h, this.getStatusPath())
  }

  /**
   * Handles errors during form submission
   */
  private async handleSubmissionError(
    error: unknown,
    request: FormRequestPayload,
    h: FormResponseToolkit
  ) {
    if (error instanceof InvalidComponentStateError) {
      return this.handleInvalidComponentStateError(error, request, h)
    }

    if (error instanceof PostPaymentSubmissionError) {
      return this.handlePostPaymentSubmissionError(error, request, h)
    }

    throw error
  }

  /**
   * Handles InvalidComponentStateError during submission
   */
  private async handleInvalidComponentStateError(
    error: InvalidComponentStateError,
    request: FormRequestPayload,
    h: FormResponseToolkit
  ) {
    const cacheService = getCacheService(request.server)

    if (error.shouldResetState) {
      await cacheService.resetComponentStates(request, error.getStateKeys())

      if (error.isPaymentExpired) {
        request.yar.flash(PAYMENT_EXPIRED_NOTIFICATION, true, true)
        return this.proceed(request, h, error.component.page?.path)
      }
    }

    const govukError = createError(error.component.name, error.userMessage)
    request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

    const redirectPath = error.shouldResetState
      ? error.component.page?.path
      : undefined

    return this.proceed(request, h, redirectPath)
  }

  /**
   * Handles PostPaymentSubmissionError during submission
   */
  private handlePostPaymentSubmissionError(
    error: PostPaymentSubmissionError,
    request: FormRequestPayload,
    h: FormResponseToolkit
  ) {
    const helpUrl = error.helpLink ?? DEFAULT_PAYMENT_HELP_URL
    const helpLinkHtml = ` or you can <a href="${helpUrl}" target="_blank" rel="noopener noreferrer" class="govuk-link">contact us (opens in new tab)</a> and quote your reference number to arrange a refund`

    const govukError = createError(
      'submission',
      `There was a problem and your form was not submitted. Try submitting the form again${helpLinkHtml}.`
    )

    request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

    return this.proceed(request, h)
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

  const paymentWasCaptured = hasPaymentBeenCaptured(context)

  const formStatus = checkFormStatus(request.params)
  const logTags = ['submit', 'submissionApi']

  request.logger.info(logTags, 'Preparing email', formStatus)

  const items = getFormSubmissionData(
    summaryViewModel.context,
    summaryViewModel.details
  )

  try {
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
    main: buildMainRecords(items),
    repeaters: buildRepeaterRecords(items)
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
