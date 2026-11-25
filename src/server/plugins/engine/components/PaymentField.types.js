/**
 * Component state stored in session after pre-auth
 * @typedef {{
 *   paymentId: string
 *   reference: string
 *   amount: number
 *   description: string
 *   uuid: string
 *   formId: string
 *   isLivePayment: boolean
 *   payerEmail?: string
 *   capture?: {
 *     status: 'success' | 'failed'
 *     createdAt: string
 *   }
 *   preAuth?: {
 *     status: 'success' | 'failed' | 'started'
 *     createdAt: string
 *   }
 * }} PaymentState
 */
