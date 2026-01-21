import { randomUUID } from 'node:crypto'

import {
  type FormMetadata,
  type PaymentFieldComponent
} from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
import {
  type AnyFormRequest,
  type FormContext,
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/plugins/engine/types/index.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { PaymentService } from '~/src/server/plugins/payment/service.js'

export class PaymentField extends FormComponent {
  declare options: PaymentFieldComponent['options']

  constructor(
    def: PaymentFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    this.options = def.options
  }

  /**
   * Gets the PaymentState from form submission state
   */
  getPaymentStateFromState(
    state: FormSubmissionState
  ): PaymentState | undefined {
    const value = state[this.name] as unknown
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

    return {
      ...viewModel,
      amount: this.options.amount,
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
   * STUB - Jez to implement
   */
  static async dispatcher(
    request: FormRequestPayload,
    h: FormResponseToolkit,
    args: PaymentDispatcherArgs
  ): Promise<unknown> {
    const paymentService = new PaymentService()

    // 1. Generate UUID token and store in session
    const uuid = randomUUID()

    const { options } = args.component
    const { model } = args.controller

    const state = await args.controller.getState(request)

    const data = {
      uuid,
      reference: state.$$__referenceNumber,
      description: options.description,
      amount: options.amount
    } as PaymentState

    request.yar.set(`${request.url.pathname}-payment`, data)

    const formId = model.formId
    const slug = `/${model.basePath}`

    // 2. Call paymentService.createPayment()
    const payment = await paymentService.createPayment(
      data.amount,
      data.description,
      uuid,
      data.reference,
      { formId, slug }
    )

    // 3. Redirect to GOV.UK Pay paymentUrl
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
