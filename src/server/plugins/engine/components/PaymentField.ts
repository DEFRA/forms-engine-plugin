import { randomUUID } from 'node:crypto'

import {
  type FormMetadata,
  type PaymentFieldComponent
} from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'
import joi, { type ObjectSchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
import { getPluginOptions } from '~/src/server/plugins/engine/helpers.js'
import {
  PaymentErrorTypes,
  PaymentPreAuthError,
  PaymentSubmissionError
} from '~/src/server/plugins/engine/pageControllers/errors.js'
import {
  type FormContext,
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/plugins/engine/types/index.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type PaymentExternalArgs
} from '~/src/server/plugins/engine/types.js'
import {
  createPaymentService,
  formatCurrency
} from '~/src/server/plugins/payment/helper.js'

export class PaymentField extends FormComponent {
  declare options: PaymentFieldComponent['options']
  declare formSchema: ObjectSchema
  declare stateSchema: ObjectSchema
  isAppendageStateSingleObject = true

  constructor(
    def: PaymentFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    this.options = def.options

    const paymentStateSchema = joi
      .object({
        paymentId: joi.string().required(),
        reference: joi.string().required(),
        amount: joi.number().required(),
        description: joi.string().required(),
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
   */
  getPaymentStateFromState(
    state: FormSubmissionState
  ): PaymentState | undefined {
    const value = state[this.name]
    return this.isPaymentState(value) ? value : undefined
  }

  getDisplayStringFromState(state: FormSubmissionState): string {
    const value = this.getPaymentStateFromState(state)

    if (!value) {
      return ''
    }

    return `${formatCurrency(value.amount)} - ${value.description}`
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)

    // Payload is pre-populated from state if a payment has already been made
    const paymentState = this.isPaymentState(payload[this.name] as unknown)
      ? (payload[this.name] as unknown as PaymentState)
      : undefined

    // When user initially visits the payment page, there is no payment state yet so the amount is read form the form definition.
    const amount = paymentState?.amount ?? this.options.amount

    return {
      ...viewModel,
      amount: formatCurrency(amount),
      description: this.options.description,
      paymentState
    }
  }

  /**
   * Type guard to check if value is PaymentState
   */
  isPaymentState(value: unknown): value is PaymentState {
    return PaymentField.isPaymentState(value)
  }

  /**
   * Static type guard to check if value is PaymentState
   */
  static isPaymentState(value: unknown): value is PaymentState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false
    }

    const state = value as PaymentState
    return (
      typeof state.paymentId === 'string' &&
      typeof state.amount === 'number' &&
      typeof state.description === 'string'
    )
  }

  /**
   * Override base isState to validate PaymentState
   */
  isState(value?: FormStateValue | FormState): value is FormState {
    return this.isPaymentState(value)
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isPaymentState(value)
      ? (value as unknown as NonNullable<FormStateValue>)
      : undefined
  }

  getContextValueFromState(state: FormSubmissionState) {
    return this.isPaymentState(state)
      ? `Reference: ${state.reference}\nAmount: ${formatCurrency(state.amount)}`
      : ''
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return PaymentField.getAllPossibleErrors()
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
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
   * Dispatcher for external redirect to GOV.UK Pay
   */
  static async dispatcher(
    request: FormRequestPayload,
    h: FormResponseToolkit,
    args: PaymentExternalArgs
  ): Promise<unknown> {
    const { options, name: componentName } = args.component
    const { model } = args.controller

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

    const reference = state.$$__referenceNumber as string
    const amount = options.amount

    const description = options.description

    const slug = `/${model.basePath}`

    const payCallbackUrl = `${baseUrl}/payment-callback?uuid=${uuid}`
    const paymentPageUrl = args.sourceUrl

    const amountInPence = Math.round(amount * 100)
    const payment = await paymentService.createPayment(
      amountInPence,
      description,
      payCallbackUrl,
      reference,
      isLivePayment,
      { formId, slug }
    )

    const sessionData: PaymentSessionData = {
      uuid,
      formId,
      reference,
      amount,
      description,
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
   */
  async onSubmit(
    request: FormRequestPayload,
    _metadata: FormMetadata,
    context: FormContext
  ): Promise<void> {
    const paymentState = this.getPaymentStateFromState(context.state)

    if (!paymentState) {
      throw new PaymentPreAuthError(
        this,
        'Complete the payment to continue',
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
      this.options.amount,
      this
    )

    if (status.state.status === 'success') {
      await this.markPaymentCaptured(request, paymentState)
      return
    }

    if (status.state.status !== 'capturable') {
      throw new PaymentPreAuthError(
        this,
        'Your payment authorisation has expired. Please add your payment details again.',
        true,
        PaymentErrorTypes.PaymentExpired
      )
    }

    const captured = await paymentService.capturePayment(
      paymentId,
      status.amount
    )

    if (!captured) {
      throw new PaymentPreAuthError(
        this,
        'There was a problem and your form was not submitted. Try submitting the form again.',
        false
      )
    }

    await this.markPaymentCaptured(request, paymentState)
  }

  /**
   * Updates payment state to mark capture as successful
   * This ensures we don't try to re-capture on submission retry
   */
  private async markPaymentCaptured(
    request: FormRequestPayload,
    paymentState: PaymentState
  ): Promise<void> {
    const updatedState: PaymentState = {
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
 */
export interface PaymentSessionData {
  uuid: string
  formId: string
  reference: string
  amount: number
  description: string
  paymentId: string
  componentName: string
  returnUrl: string
  failureUrl: string
  isLivePayment: boolean
}
