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
import { InvalidComponentStateError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import {
  type AnyFormRequest,
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
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { createPaymentService } from '~/src/server/plugins/payment/helper.js'

export class PaymentField extends FormComponent {
  declare options: PaymentFieldComponent['options']
  declare formSchema: ObjectSchema
  declare stateSchema: ObjectSchema

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
    this.stateSchema = paymentStateSchema.default(null).allow(null)
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

    return `£${value.amount.toFixed(2)} - ${value.description}`
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)

    const paymentState = this.isPaymentState(payload[this.name] as unknown)
      ? (payload[this.name] as unknown as PaymentState)
      : undefined

    const amount = this.options.amount ?? 0
    const formattedAmount = amount.toFixed(2)

    return {
      ...viewModel,
      amount: formattedAmount,
      description: this.options.description,
      paymentState
    }
  }

  /**
   * Type guard to check if value is PaymentState
   */
  isPaymentState(value: unknown): value is PaymentState {
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
    args: PaymentDispatcherArgs
  ): Promise<unknown> {
    const isLivePayment = args.isLive && !args.isPreview
    const formId = args.controller.model.formId
    const paymentService = createPaymentService(isLivePayment, formId)

    const uuid = randomUUID()

    const { options, name: componentName } = args.component
    const { model } = args.controller

    const state = await args.controller.getState(request)
    const reference = state.$$__referenceNumber as string
    const amount = options.amount ?? 0
    const description = options.description ?? ''

    const slug = `/${model.basePath}`

    const { baseUrl } = getPluginOptions(request.server)
    const payCallbackUrl = `${baseUrl}/payment-callback?uuid=${uuid}`
    const summaryUrl = `${baseUrl}/${model.basePath}/summary`
    const paymentPageUrl = args.sourceUrl

    const amountInPence = Math.round(amount * 100)
    const payment = await paymentService.createPayment(
      amountInPence,
      description,
      payCallbackUrl,
      reference,
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
      throw new InvalidComponentStateError(
        this,
        'Complete the payment to continue',
        { shouldResetState: true }
      )
    }

    if (paymentState.capture?.status === 'success') {
      return
    }

    const { paymentId, isLivePayment, formId } = paymentState
    const paymentService = createPaymentService(isLivePayment, formId)

    /**
     * @see https://docs.payments.service.gov.uk/api_reference/#payment-status-lifecycle
     */
    const status = await paymentService.getPaymentStatus(paymentId)

    if (status.state.status === 'success') {
      await this.markPaymentCaptured(request, paymentState)
      return
    }

    if (status.state.status !== 'capturable') {
      throw new InvalidComponentStateError(
        this,
        'Your payment authorisation has expired. Please add your payment details again.',
        { shouldResetState: true, isPaymentExpired: true }
      )
    }

    const captured = await paymentService.capturePayment(paymentId)

    if (!captured) {
      throw new InvalidComponentStateError(
        this,
        'There was a problem and your form was not submitted. Try submitting the form again.',
        { shouldResetState: false }
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

export interface PaymentDispatcherArgs {
  controller: {
    model: {
      formId: string
      basePath: string
      name: string
    }
    getState: (request: AnyFormRequest) => Promise<FormSubmissionState>
  }
  component: PaymentField
  sourceUrl: string
  isLive: boolean
  isPreview: boolean
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
