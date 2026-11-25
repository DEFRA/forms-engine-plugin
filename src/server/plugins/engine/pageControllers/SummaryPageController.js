import { hasComponentsEvenIfNoNext } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'

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
import { SummaryViewModel } from '~/src/server/plugins/engine/models/index.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  InvalidComponentStateError,
  PaymentErrorTypes,
  PaymentPreAuthError,
  PaymentSubmissionError
} from '~/src/server/plugins/engine/pageControllers/errors.js'
import {
  buildMainRecords,
  buildRepeaterRecords
} from '~/src/server/plugins/engine/pageControllers/helpers/submission.js'
import {
  DEFAULT_PAYMENT_HELP_URL,
  formatCurrency,
  formatPaymentDate
} from '~/src/server/plugins/payment/helper.js'
import { FormAction } from '~/src/server/routes/types.js'

export class SummaryPageController extends QuestionPageController {
  /** @type {Page} */
  // @ts-expect-error TS2729: the base constructor has already set it
  pageDef = this.pageDef

  allowSaveAndExit = true

  /**
   * The controller which is used when Page["controller"] is defined as "./pages/summary.js"
   */

  /**
   * Finds the PaymentField component across all pages in the model.
   * Payment pages are skipped in the normal page walk
   * @private
   * @returns {PaymentField | undefined}
   */
  findPaymentField() {
    return this.model.pages
      .flatMap((page) => page.collection.fields)
      .find(
        /**
         * @returns {field is PaymentField}
         */
        (field) => field instanceof PaymentField
      )
  }

  /**
   * @param {FormModel} model
   * @param {Page} pageDef
   */
  constructor(model, pageDef) {
    super(model, pageDef)
    this.viewName = /** @type {QuestionPageController['viewName']} */ (
      'summary'
    )

    // Components collection
    this.collection = /** @type {QuestionPageController['collection']} */ (
      new ComponentCollection(
        hasComponentsEvenIfNoNext(pageDef) ? pageDef.components : [],
        { model, page: this }
      )
    )
  }

  /**
   * @param {FormContextRequest} request
   * @param {FormContext} context
   * @param {Translator} [translator]
   * @returns {SummaryViewModel}
   */
  getSummaryViewModel(
    request,
    context,
    translator = context.translator ?? this.model.createTranslator()
  ) {
    const { t } = translator

    const viewModel = new SummaryViewModel(request, this, context, translator)

    const { query } = request
    const { payload, errors, state } = context

    const paymentField = this.findPaymentField()

    if (paymentField) {
      const resolvedAmount = PaymentField.resolveAmount(
        paymentField.options,
        this.model,
        state
      )
      const paymentState = paymentField.getPaymentStateFromState(state)

      if (paymentState?.amount === resolvedAmount) {
        viewModel.paymentState = paymentState
        viewModel.paymentDetails = this.buildPaymentDetails(
          paymentField,
          paymentState,
          translator
        )
      }

      if (resolvedAmount > 0) {
        viewModel.paymentRequired = true
      }
      if (
        paymentState &&
        paymentState.preAuth?.status === 'success' &&
        paymentState.amount === resolvedAmount
      ) {
        viewModel.paymentPreAuthorized = true
      }
    }

    const components = this.collection.getViewModel({
      payload,
      errors,
      query,
      translator
    })

    viewModel.backLink = this.getBackLink(request, context, t)
    viewModel.feedbackLink = this.feedbackLink
    viewModel.phaseTag = this.phaseTag
    viewModel.components = components
    viewModel.allowSaveAndExit = this.shouldShowSaveAndExit(request.server)
    viewModel.errors = errors

    return viewModel
  }

  /**
   * @private
   * @param {PaymentField} paymentField
   * @param {NonNullable<ReturnType<PaymentField['getPaymentStateFromState']>>} paymentState
   * @param {Translator} translator
   */
  buildPaymentDetails(paymentField, paymentState, translator) {
    const { t } = translator
    const rows = [
      {
        key: { text: t('pages.summary.paymentFor') },
        value: { text: paymentState.description }
      },
      {
        key: { text: t('pages.summary.totalAmount') },
        value: { text: formatCurrency(paymentState.amount) }
      },
      {
        key: { text: t('pages.summary.reference') },
        value: { text: paymentState.reference }
      }
    ]

    if (paymentState.preAuth?.createdAt) {
      rows.push({
        key: { text: t('pages.summary.dateOfPayment') },
        value: {
          text: formatPaymentDate(
            paymentState.preAuth.createdAt,
            translator.language
          )
        }
      })
    }

    return {
      title: { text: t('pages.summary.paymentDetailsTitle') },
      summaryList: { rows }
    }
  }

  /**
   * Returns an async function. This is called in plugin.js when there is a GET request at `/{id}/{path*}`,
   */
  makeGetRouteHandler() {
    /**
     * @param {FormRequest} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return async (request, context, h) => {
      const { viewName } = this

      const translator = this.getTranslator(request)
      const { t } = translator

      // After GOV.UK Pay callback, auto-submit the form instead of
      // showing CYA again. The payment is already pre-authorized.
      if (request.query.paymentComplete === 'true') {
        return this.handleFormSubmit(
          /** @type {FormRequestPayload} */ (/** @type {unknown} */ (request)),
          context,
          h
        )
      }

      await this.reconcilePaymentState(request, context)

      const viewModel = this.getSummaryViewModel(request, context, translator)

      viewModel.hasMissingNotificationEmail =
        await this.hasMissingNotificationEmail(request, context)

      viewModel.t = t
      return h.view(viewName, viewModel)
    }
  }

  /**
   * Checks if the resolved payment amount has changed since pre-auth
   * and invalidates stale payment state if so.
   * @private
   * @param {FormRequest} request
   * @param {FormContext} context
   */
  async reconcilePaymentState(request, context) {
    const paymentField = this.findPaymentField()

    if (!paymentField) {
      return
    }

    const resolvedAmount = PaymentField.resolveAmount(
      paymentField.options,
      this.model,
      context.state
    )
    const paymentState = paymentField.getPaymentStateFromState(context.state)

    if (paymentState && paymentState.amount !== resolvedAmount) {
      const cacheService = getCacheService(request.server)
      await cacheService.resetComponentStates(request, [paymentField.name])
    }
  }

  /**
   * Returns an async function. This is called in plugin.js when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler() {
    /**
     * @param {FormRequestPayload} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return async (request, context, h) => {
      const { action } = request.payload
      if (action === FormAction.SaveAndExit) {
        return this.handleSaveAndExit(request, context, h)
      }

      return this.handleFormSubmit(request, context, h)
    }
  }

  /**
   * @param {FormRequestPayload} request
   * @param {FormContext} context
   * @param {FormResponseToolkit} h
   */
  async handleFormSubmit(request, context, h) {
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
      const translator = this.getTranslator(request)
      const viewModel = this.getSummaryViewModel(request, context, translator)

      try {
        await submitForm(
          context,
          formMetadata,
          request,
          viewModel,
          model,
          notificationEmail,
          translator
        )
      } catch (error) {
        return this.handleSubmissionError(error, request, h)
      }
    }

    await cacheService.setConfirmationState(
      request,
      /** @type {FormConfirmationState} */ ({
        confirmed: true,
        formId: context.state.formId,
        referenceNumber: context.referenceNumber
      })
    )

    await cacheService.clearState(request)

    return this.proceed(request, h, this.getStatusPath())
  }

  /**
   * Handles errors during form submission
   * @private
   * @param {unknown} error
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   */
  async handleSubmissionError(error, request, h) {
    if (error instanceof InvalidComponentStateError) {
      return this.handleInvalidComponentStateError(error, request, h)
    }

    if (error instanceof PaymentPreAuthError) {
      return this.handlePaymentPreAuthError(error, request, h)
    }

    if (error instanceof PaymentSubmissionError) {
      return this.handlePaymentSubmissionError(error, request, h)
    }

    throw error
  }

  /**
   * Handles InvalidComponentStateError during submission
   * @private
   * @param {InvalidComponentStateError} error
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   */
  async handleInvalidComponentStateError(error, request, h) {
    const cacheService = getCacheService(request.server)

    const govukError = createError(error.component.name, error.userMessage)

    request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

    await cacheService.resetComponentStates(request, error.getStateKeys())

    return this.proceed(request, h, error.component.page?.path)
  }

  /**
   * Handles PaymentPreAuthError during submission
   * @private
   * @param {PaymentPreAuthError} error
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   */
  async handlePaymentPreAuthError(error, request, h) {
    const cacheService = getCacheService(request.server)

    if (error.shouldResetState) {
      await cacheService.resetComponentStates(request, error.getStateKeys())

      if (error.errorType === PaymentErrorTypes.PaymentExpired) {
        request.yar.flash(PAYMENT_EXPIRED_NOTIFICATION, true, true)
        return this.proceed(request, h, error.component.page?.path)
      }
    }

    // Payment page is skipped in the page walk, so proceed() would redirect
    // to an earlier page. For PaymentIncomplete, redirect directly to the
    // payment page using its href.
    if (
      error.errorType === PaymentErrorTypes.PaymentIncomplete &&
      error.component.page
    ) {
      return h
        .redirect(error.component.page.getHref(error.component.page.path))
        .code(StatusCodes.SEE_OTHER)
    }

    const govukError = createError(error.component.name, error.userMessage)
    request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

    const redirectPath = error.shouldResetState
      ? error.component.page?.path
      : undefined

    return this.proceed(request, h, redirectPath)
  }

  /**
   * Handles PaymentSubmissionError during submission
   * @private
   * @param {PaymentSubmissionError} error
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   */
  handlePaymentSubmissionError(error, request, h) {
    const { t } = this.getTranslator(request)

    const helpUrl = error.helpLink ?? DEFAULT_PAYMENT_HELP_URL
    const contactUsLink = `<a href="${helpUrl}" target="_blank" rel="noopener noreferrer" class="govuk-link">${t('pages.summary.contactUsLinkText')}</a>`
    const helpLinkHtml = t('pages.summary.submissionFailedContactSuffix', {
      contactUsLink
    })

    const govukError = createError(
      'submission',
      `${t('pages.summary.submissionFailed')}${helpLinkHtml}.`
    )

    request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)

    return this.proceed(request, h)
  }

  /**
   * @returns {RouteOptions<FormRequestPayloadRefs>}
   */
  get postRouteOptions() {
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

/**
 * @param {FormContext} context
 * @param {FormMetadata} formMetadata
 * @param {FormRequestPayload} request
 * @param {SummaryViewModel} summaryViewModel
 * @param {FormModel} model
 * @param {string} emailAddress
 * @param {Translator} [translator]
 */
export async function submitForm(
  context,
  formMetadata,
  request,
  summaryViewModel,
  model,
  emailAddress,
  translator = context.translator ?? model.createTranslator()
) {
  await finaliseComponents(request, formMetadata, context, model)

  const paymentWasCaptured = hasPaymentBeenCaptured(context, model)

  const formStatus = checkFormStatus(request.params)
  const logTags = ['submit', 'submissionApi']

  request.logger.info(logTags, 'Preparing email', formStatus)

  const items = getFormSubmissionData(
    summaryViewModel.context,
    summaryViewModel.details,
    model,
    translator
  )

  try {
    request.logger.info(logTags, 'Submitting data')
    const submitResponse = await submitData(
      model,
      items,
      emailAddress,
      request.yar.id,
      translator,
      summaryViewModel.context.referenceNumber
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
      throw new PaymentSubmissionError(
        context.referenceNumber,
        formMetadata.contact?.online?.url
      )
    }
    throw err
  }
}

/**
 * Checks if any payment component has been captured
 * @param {FormContext} context
 * @param {FormModel} model
 * @returns {boolean}
 */
function hasPaymentBeenCaptured(context, model) {
  for (const page of model.pages) {
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
 * @param {FormRequestPayload} request
 * @param {FormMetadata} metadata
 * @param {FormContext} context
 * @param {FormModel} model
 */
async function finaliseComponents(request, metadata, context, model) {
  // Get fields from relevant pages (normal components)
  // plus PaymentField from all pages (payment page is skipped in the page walk)
  const allFields = new Set([
    ...context.relevantPages.flatMap((page) => page.collection.fields),
    ...model.pages
      .flatMap((page) => page.collection.fields)
      .filter((field) => field instanceof PaymentField)
  ])

  for (const component of allFields) {
    await component.onSubmit(request, metadata, context)
  }
}

/**
 * @param {FormModel} model
 * @param {DetailItem[]} items
 * @param {string} retrievalKey
 * @param {string} sessionId
 * @param {Translator} translator
 * @param {string} referenceNumber
 */
function submitData(
  model,
  items,
  retrievalKey,
  sessionId,
  translator,
  referenceNumber
) {
  const { formSubmissionService } = model.services
  const { submit } = formSubmissionService

  /** @type {SubmitPayload} */
  const payload = {
    sessionId,
    retrievalKey,
    referenceNumber,
    main: buildMainRecords(items, translator),
    repeaters: buildRepeaterRecords(items, translator),
    // Only populate the language property if the form is multi-language enabled
    // @ts-expect-error - dynamic language property
    language: model.def.metadata?.translations?.cy
      ? translator.language
      : undefined
  }
  return submit(payload)
}

/**
 * @param {FormContext} context
 * @param {Detail[]} details
 * @param {FormModel} model
 * @param {Translator} [translator]
 */
export function getFormSubmissionData(
  context,
  details,
  model,
  translator = context.translator ?? model.createTranslator()
) {
  const items = context.relevantPages
    .map(({ href }) =>
      details.flatMap(({ items }) =>
        items.filter(({ page }) => page.href === href)
      )
    )
    .flat()

  const paymentItems = getPaymentFieldItems(context, translator, model)

  return [...items, ...paymentItems]
}

/**
 * Gets DetailItems for PaymentField components
 * PaymentField is excluded from summaryDetails for UI but needs to be in submission data
 * @param {FormContext} context
 * @param {Translator} translator
 * @param {FormModel} model
 * @returns {DetailItemField[]}
 */
function getPaymentFieldItems(context, translator, model) {
  /** @type {DetailItemField[]} */
  const items = []

  for (const page of model.pages) {
    for (const field of page.collection.fields) {
      if (field instanceof PaymentField) {
        items.push({
          name: field.name,
          page,
          title: field.title,
          label: field.summaryLabel,
          field,
          state: context.state,
          href: page.href,
          value: field.getDisplayStringFromState(context.state, translator)
        })
      }
    }
  }

  return items
}

/**
 * @import { FormMetadata, Page, SubmitPayload } from '@defra/forms-model'
 * @import { RouteOptions } from '@hapi/hapi'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { Detail, DetailItem, DetailItemField } from '~/src/server/plugins/engine/models/types.js'
 * @import { FormConfirmationState, FormContext, FormContextRequest } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormRequestPayloadRefs, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
