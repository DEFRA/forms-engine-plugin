/**
 * @typedef {object} PaymentResponseState
 * @property {'created' | 'started' | 'submitted' | 'capturable' | 'success' | 'failed' | 'cancelled' | 'error'} status - Current status of the payment
 * @property {boolean} finished - Whether the payment process has completed
 * @property {string} [message] - Human-readable message about the payment state
 * @property {string} [code] - Error or status code for the payment state
 */

/**
 * @typedef {object} PaymentLink
 * @property {string} href - URL of the linked resource
 * @property {string} method - HTTP method to use for the link
 */

/**
 * @typedef {object} CreatePaymentRequest
 * @property {number} amount - Payment amount in pence
 * @property {string} reference - Unique reference for the payment
 * @property {string} description - Human-readable description of the payment
 * @property {string} return_url - URL to redirect the user to after payment
 * @property {boolean} [delayed_capture] - Whether to delay capturing the payment
 * @property {{ formId: string, slug: string }} [metadata] - Additional metadata for the payment
 */

/**
 * @typedef {object} CreatePaymentResponse
 * @property {string} payment_id - Unique identifier for the created payment
 * @property {PaymentResponseState} state - Current state of the payment
 * @property {{ next_url: PaymentLink }} _links - HATEOAS links for the payment
 */

/**
 * Base response from GOV.UK Pay GET /v1/payments/{PAYMENT_ID} endpoint
 * @typedef {object} GetPaymentResponseBase
 * @property {PaymentResponseState} state - Current state of the payment
 * @property {{ self: PaymentLink, next_url?: PaymentLink }} _links - HATEOAS links for the payment
 * @property {string} [email] - The paying user's email address
 */

/**
 * Response from GOV.UK Pay GET /v1/payments/{PAYMENT_ID} endpoint - not underscore in property name
 * @typedef {object} GetPaymentApiResponsePaymentProp
 * @property {string} payment_id - Unique identifier for the payment
 * @property {number} amount - amount of the payment
 */

/**
 * Response from GOV.UK Pay GET /v1/payments/{PAYMENT_ID} endpoint
 * @typedef {GetPaymentResponseBase & GetPaymentApiResponsePaymentProp} GetPaymentApiResponse
 */

/**
 * Response returned from getPaymentStatus - subtley different from GetPaymentApiResponse
 * @typedef {object} GetPaymentResponsePaymentProp
 * @property {string} paymentId - Unique identifier for the payment - note no underscore in property name
 * @property {number} amount - amount of the payment
 */

/**
 * Response returned from getPaymentStatus - subtley different from GetPaymentApiResponse
 * @typedef {GetPaymentResponseBase & GetPaymentResponsePaymentProp} GetPaymentResponse
 */

/**
 * Payment session data stored when dispatching to GOV.UK Pay
 * @typedef {object} PaymentSessionData
 * @property {string} uuid - unique identifier for this payment attempt
 * @property {string} formId - id of the form
 * @property {string} reference - form reference number
 * @property {number} amount - amount in pounds
 * @property {string} description - payment description
 * @property {string} paymentId - GOV.UK Pay payment ID
 * @property {string} componentName - name of the PaymentField component
 * @property {string} returnUrl - URL to redirect to after successful payment
 * @property {string} failureUrl - URL to redirect to after failed/cancelled payment
 * @property {boolean} isLivePayment - whether the payment is using live API key
 */
