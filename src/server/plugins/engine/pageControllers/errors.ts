import { type FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'

export enum PaymentErrorTypes {
  PaymentExpired = 'PaymentExpired',
  PaymentIncomplete = 'PaymentIncomplete',
  PaymentAmountMismatch = 'PaymentAmountMismatch'
}
export class PaymentPreAuthError extends Error {
  public readonly component: FormComponent
  public readonly userMessage: string

  /**
   * Whether to reset the component state and redirect to the component's page.
   * - `true`: Reset state and redirect (e.g., payment expired - user must re-enter)
   * - `false`: Keep state and stay on current page with error (e.g., capture failed - user can retry)
   */
  public readonly shouldResetState: boolean

  /**
   * When supplied, an "Important" notification banner will be shown based on the value.
   */
  public readonly errorType: PaymentErrorTypes | undefined

  constructor(
    component: FormComponent,
    userMessage: string,
    shouldResetState: boolean,
    errorType?: PaymentErrorTypes
  ) {
    super('Payment capture failed')
    this.name = 'PaymentPreAuthError'
    this.component = component
    this.userMessage = userMessage
    this.shouldResetState = shouldResetState
    this.errorType = errorType
  }

  getStateKeys() {
    const extraStateKeys =
      this.component.page?.getStateKeys(this.component) ?? []

    return [this.component.name].concat(extraStateKeys)
  }
}

/**
 * Thrown when form submission fails after payment has been captured.
 * User needs to retry or contact support for a refund.
 */
export class PaymentSubmissionError extends Error {
  public readonly referenceNumber: string
  public readonly helpLink?: string

  constructor(referenceNumber: string, helpLink?: string) {
    super('Form submission failed after payment capture')
    this.name = 'PaymentSubmissionError'
    this.referenceNumber = referenceNumber
    this.helpLink = helpLink
  }

  static checkPaymentAmount(
    stateAmount: number,
    definitionAmount: number | undefined,
    component: FormComponent
  ) {
    if (stateAmount !== definitionAmount) {
      throw new PaymentPreAuthError(
        component,
        'The pre-authorised payment amount is somehow different from that requested. Try adding payment details again.',
        true,
        PaymentErrorTypes.PaymentIncomplete
      )
    }
  }
}

/**
 * Thrown when a component has an invalid state. This is typically only required where state needs
 * to be checked against an external source upon submission of a form. For example: file upload
 * has internal state (file upload IDs) but also external state (files in S3). The internal state
 * is always validated by the engine, but the external state needs validating too.
 *
 * This should be used within a formComponent.onSubmit(...).
 */
export class InvalidComponentStateError extends Error {
  public readonly component: FormComponent
  public readonly userMessage: string

  constructor(component: FormComponent, userMessage: string) {
    const message = `Invalid component state for: ${component.name}`
    super(message)
    this.name = 'InvalidComponentStateError'
    this.component = component
    this.userMessage = userMessage
  }

  getStateKeys() {
    const extraStateKeys =
      this.component.page?.getStateKeys(this.component) ?? []

    return [this.component.name].concat(extraStateKeys)
  }
}
