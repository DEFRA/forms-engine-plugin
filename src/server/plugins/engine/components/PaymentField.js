import { randomUUID } from 'node:crypto'

import { StatusCodes } from 'http-status-codes'
import joi from 'joi'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { COMPONENT_STATE_ERROR } from '~/src/server/constants.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  createError,
  getPluginOptions
} from '~/src/server/plugins/engine/helpers.js'
import {
  PaymentErrorTypes,
  PaymentPreAuthError,
  PaymentSubmissionError
} from '~/src/server/plugins/engine/pageControllers/errors.js'
import {
  createPaymentService,
  formatCurrency
} from '~/src/server/plugins/payment/helper.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

export class PaymentField extends FormComponent {
  /** @type {PaymentFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {ObjectSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {ObjectSchema} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {PaymentFieldComponent} */
  // @ts-expect-error TS2729: the base constructor has already set it
  def = this.def

  isAppendageStateSingleObject = true

  /**
   * @param {PaymentFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    this.options = def.options
    this.def = def

    const paymentStateSchema = joi
      .object({
        paymentId: joi.string().required(),
        reference: joi.string().required(),
        amount: joi.number().required(),
        description: joi.string().required(),
        descriptionInEng: joi.string().optional(),
        uuid: joi.string().uuid().required(),
        formId: joi.string().required(),
        isLivePayment: joi.boolean().required(),
        preAuth: joi
          .object({
            status: joi
              .string()
              .valid('success', 'failed', 'started')
              .required(),
            createdAt: joi.string().isoDate().required()
          })
          .required()
      })
      .unknown(true)
      .label(this.label)

    this.formSchema = paymentStateSchema
    // 'required()' forces the payment page to be invalid until we have valid payment state
    // i.e. the user will automatically be directed back to the payment page
    // if they attempt to access future pages when no payment entered yet
    this.stateSchema = paymentStateSchema.required()
  }

  /**
   * Gets the PaymentState from form submission state
   * @param {FormSubmissionState} state
   * @returns {PaymentState | undefined}
   */
  getPaymentStateFromState(state) {
    const value = state[this.name]
    return this.isPaymentState(value) ? value : undefined
  }

  /**
   * @param {FormSubmissionState} state
   * @param {Translator} [_translator]
   * @returns {string}
   */
  getDisplayStringFromState(state, _translator) {
    const value = this.getPaymentStateFromState(state)

    if (!value) {
      return ''
    }

    return `${formatCurrency(value.amount)} - ${value.description}`
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { payload, translator = this.model.createTranslator() } = context

    const viewModel = super.getViewModel(context)
    const { tComponent } = translator

    // Payload is pre-populated from state if a payment has already been made
    const paymentState = this.isPaymentState(
      /** @type {unknown} */ (payload[this.name])
    )
      ? /** @type {PaymentState} */ (
          /** @type {unknown} */ (payload[this.name])
        )
      : undefined

    // Use payment state amount if pre-authorized, otherwise use default.
    // The page controller overrides this with the resolved conditional amount
    // using the full form state (which getViewModel doesn't have access to).
    const amount = paymentState?.amount ?? this.options.amount

    return {
      ...viewModel,
      amount: formatCurrency(amount),
      description:
        tComponent(this.def, 'paymentDescription') || this.options.description,
      paymentState
    }
  }

  /**
   * Type guard to check if value is PaymentState
   * @param {unknown} value
   * @returns {value is PaymentState}
   */
  isPaymentState(value) {
    return PaymentField.isPaymentState(value)
  }

  /**
   * Static type guard to check if value is PaymentState
   * @param {unknown} value
   * @returns {value is PaymentState}
   */
  static isPaymentState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false
    }

    const state = /** @type {PaymentState} */ (value)
    return (
      typeof state.paymentId === 'string' &&
      typeof state.amount === 'number' &&
      typeof state.description === 'string'
    )
  }

  /**
   * Override base isState to validate PaymentState
   * @param {FormStateValue | FormState} [value]
   * @returns {value is FormState}
   */
  isState(value) {
    return this.isPaymentState(value)
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  getFormValue(value) {
    return this.isPaymentState(value)
      ? /** @type {NonNullable<FormStateValue>} */ (
          /** @type {unknown} */ (value)
        )
      : undefined
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    return this.isPaymentState(state)
      ? `Reference: ${state.reference}\nAmount: ${formatCurrency(state.amount)}`
      : ''
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return PaymentField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        {
          type: 'paymentRequired',
          template: 'Complete the payment to continue'
        }
      ],
      advancedSettingsErrors: []
    }
  }

  /**
   * Resolves the payment amount from conditional amounts configuration.
   * Evaluates conditions in order; first true condition wins.
   * Falls back to the default options.amount.
   * @param {PaymentFieldComponent['options']} options
   * @param {FormModel} model
   * @param {FormState} state
   * @returns {number}
   */
  static resolveAmount(options, model, state) {
    const { conditionalAmounts } = options

    if (!conditionalAmounts?.length) {
      return options.amount
    }

    for (const { condition, amount } of conditionalAmounts) {
      if (!model.conditions[condition]) {
        logger.warn(
          `[payment] Condition '${condition}' not found in form conditions. Skipping.`
        )
        continue
      }
      if (model.conditions[condition].fn(state)) {
        return amount
      }
    }

    return options.amount
  }

  /**
   * Dispatcher for external redirect to GOV.UK Pay
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   * @param {PaymentExternalArgs} args
   * @returns {Promise<unknown>}
   */
  static async dispatcher(request, h, args) {
    const { options, name: componentName } = args.component
    const { model } = args.controller
    const { language, t, tComponent } = model.createTranslator(
      resolveLanguage(request)
    )
    const state = await args.controller.getState(request)
    const { baseUrl } = getPluginOptions(request.server)
    const summaryUrl = `${baseUrl}/${model.basePath}/summary`

    const existingPaymentState = state[componentName]
    if (
      PaymentField.isPaymentState(existingPaymentState) &&
      existingPaymentState.preAuth?.status === 'success'
    ) {
      return h.redirect(summaryUrl).code(StatusCodes.SEE_OTHER)
    }

    const isLivePayment = args.isLive && !args.isPreview
    const formId = args.controller.model.formId
    const formsService = model.services.formsService
    const paymentService = await createPaymentService(
      isLivePayment,
      formId,
      formsService
    )

    const uuid = randomUUID()

    const reference = model.getReference(state, request)
    const resolvedAmount = PaymentField.resolveAmount(options, model, state)

    // Zero-amount safety net (page skip should prevent this, but defensive)
    if (resolvedAmount === 0) {
      return h.redirect(summaryUrl).code(StatusCodes.SEE_OTHER)
    }

    const description =
      tComponent(args.component, 'paymentDescription') || options.description

    const payCallbackUrl = `${baseUrl}/payment-callback?uuid=${uuid}`
    const paymentPageUrl = args.sourceUrl

    /** @type {string | undefined} */
    let prefilledEmail
    const userConfirmationEmail = state.userConfirmationEmailAddress
    if (typeof userConfirmationEmail === 'string' && userConfirmationEmail) {
      prefilledEmail = userConfirmationEmail
    }

    const amountInPence = Math.round(resolvedAmount * 100)
    const payment = await paymentService.createPayment(
      amountInPence,
      description,
      payCallbackUrl,
      reference,
      isLivePayment,
      { formId, language },
      prefilledEmail
    )

    if (!payment) {
      const message = isLivePayment
        ? t('components.paymentField.cannotTakePayment')
        : t('components.paymentField.testApiKey')
      const govukError = createError(componentName, message)
      request.yar.flash(COMPONENT_STATE_ERROR, govukError, true)
      return h
        .redirect(`${request.url.pathname}${request.url.search}`)
        .code(StatusCodes.SEE_OTHER)
    }

    /** @type {PaymentSessionData} */
    const sessionData = {
      uuid,
      formId,
      reference,
      amount: resolvedAmount,
      description,
      descriptionInEng: options.description,
      paymentId: payment.paymentId,
      componentName,
      returnUrl: summaryUrl,
      failureUrl: paymentPageUrl,
      isLivePayment
    }

    request.yar.set(`payment-${uuid}`, sessionData)

    return h.redirect(payment.paymentUrl).code(StatusCodes.SEE_OTHER)
  }

  /**
   * Called on form submission to capture the payment
   * @see https://docs.payments.service.gov.uk/delayed_capture/#delay-taking-a-payment
   * @param {FormRequestPayload} request
   * @param {FormMetadata} _metadata
   * @param {FormContext} context
   * @returns {Promise<void>}
   */
  async onSubmit(request, _metadata, context) {
    const language = resolveLanguage(request)
    const { t } = this.model.createTranslator(language)

    // Zero-amount bypass — no capture needed
    const resolvedAmount = PaymentField.resolveAmount(
      this.options,
      this.model,
      context.state
    )
    if (resolvedAmount === 0) {
      return
    }

    const paymentState = this.getPaymentStateFromState(context.state)

    if (!paymentState) {
      throw new PaymentPreAuthError(
        this,
        t('components.paymentField.completePayment'),
        true,
        PaymentErrorTypes.PaymentIncomplete
      )
    }

    if (paymentState.capture?.status === 'success') {
      return
    }

    const { paymentId, isLivePayment, formId } = paymentState
    const formsService = this.model.services.formsService
    const paymentService = await createPaymentService(
      isLivePayment,
      formId,
      formsService
    )

    /**
     * @see https://docs.payments.service.gov.uk/api_reference/#payment-status-lifecycle
     */
    const status = await paymentService.getPaymentStatus(
      paymentId,
      isLivePayment
    )

    PaymentSubmissionError.checkPaymentAmount(
      status.amount,
      resolvedAmount,
      this,
      t
    )

    if (status.state.status === 'success') {
      await this.markPaymentCaptured(request, paymentState)
      return
    }

    if (status.state.status !== 'capturable') {
      throw new PaymentPreAuthError(
        this,
        t('components.paymentField.paymentExpired'),
        true,
        PaymentErrorTypes.PaymentExpired
      )
    }

    const captured = await paymentService.capturePayment(
      paymentId,
      status.amount,
      isLivePayment
    )

    if (!captured) {
      throw new PaymentPreAuthError(
        this,
        t('components.paymentField.submissionFailed'),
        false
      )
    }

    await this.markPaymentCaptured(request, paymentState)
  }

  /**
   * Updates payment state to mark capture as successful
   * This ensures we don't try to re-capture on submission retry
   * @private
   * @param {FormRequestPayload} request
   * @param {PaymentState} paymentState
   * @returns {Promise<void>}
   */
  async markPaymentCaptured(request, paymentState) {
    /** @type {PaymentState} */
    const updatedState = {
      ...paymentState,
      capture: {
        status: 'success',
        createdAt: new Date().toISOString()
      }
    }

    if (this.page) {
      const currentState = await this.page.getState(request)
      await this.page.mergeState(request, currentState, {
        [this.name]: updatedState
      })
    }
  }
}

/**
 * Session data stored when dispatching to GOV.UK Pay
 * @typedef {{
 *   uuid: string
 *   formId: string
 *   reference: string
 *   amount: number
 *   description: string
 *   descriptionInEng?: string
 *   paymentId: string
 *   componentName: string
 *   returnUrl: string
 *   failureUrl: string
 *   isLivePayment: boolean
 * }} PaymentSessionData
 */

/**
 * @import { FormMetadata, PaymentFieldComponent } from '@defra/forms-model'
 * @import { ObjectSchema } from 'joi'
 * @import { PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { FormContext, FormRequestPayload, FormResponseToolkit } from '~/src/server/plugins/engine/types/index.js'
 * @import { ErrorMessageTemplateList, FormState, FormStateValue, FormSubmissionState, PaymentExternalArgs } from '~/src/server/plugins/engine/types.js'
 */
