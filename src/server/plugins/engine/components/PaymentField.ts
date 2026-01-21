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
import { PaymentService } from '~/src/server/plugins/payment/service.js'

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

    // Payment state is validated as an object with the required fields
    const paymentStateSchema = joi
      .object({
        paymentId: joi.string().required(),
        reference: joi.string().required(),
        amount: joi.number().required(),
        description: joi.string().required(),
        uuid: joi.string().uuid().required(),
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
    const paymentService = new PaymentService()

    // 1. Generate UUID token
    const uuid = randomUUID()

    const { options, name: componentName } = args.component
    const { model } = args.controller

    const state = await args.controller.getState(request)
    const reference = state.$$__referenceNumber as string
    const amount = options.amount ?? 0
    const description = options.description ?? ''

    const formId = model.formId
    const slug = `/${model.basePath}`

    // 2. Build the return URL for GOV.UK Pay
    const { baseUrl } = getPluginOptions(request.server)
    const returnUrl = `${baseUrl}/payment-callback?uuid=${uuid}`

    // Build the summary URL to redirect to after payment
    const summaryUrl = `${baseUrl}/${model.basePath}/summary`

    // 3. Call paymentService.createPayment()
    // GOV.UK Pay expects amount in pence, so multiply pounds by 100
    const amountInPence = Math.round(amount * 100)
    const payment = await paymentService.createPayment(
      amountInPence,
      description,
      returnUrl,
      reference,
      { formId, slug }
    )

    // 4. Store session data for the return route to use
    const sessionData: PaymentSessionData = {
      uuid,
      reference,
      amount,
      description,
      paymentId: payment.paymentId,
      componentName,
      sourceUrl: summaryUrl
    }

    request.yar.set(`payment-${uuid}`, sessionData)

    // 5. Redirect to GOV.UK Pay paymentUrl
    return h.redirect(payment.paymentUrl).code(StatusCodes.SEE_OTHER)
  }

  /**
   * Called on form submission to capture the payment
   * STUB - Jez to implement
   */
  onSubmit(
    _request: FormRequestPayload,
    _metadata: FormMetadata,
    _context: FormContext
  ): Promise<void> {
    // TODO: Implement
    // 1. Get payment state from context
    // 2. If already captured, skip
    // 3. Call paymentService.getPaymentStatus() to validate pre-auth
    // 4. Call paymentService.capturePayment()
    // 5. Update payment state with capture status
    // 6. If capture fails, throw InvalidComponentStateError
    return Promise.resolve()
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
  paymentService: PaymentService
}

/**
 * Session data stored when dispatching to GOV.UK Pay
 */
export interface PaymentSessionData {
  uuid: string
  reference: string
  amount: number
  description: string
  paymentId: string
  componentName: string
  sourceUrl: string
}
