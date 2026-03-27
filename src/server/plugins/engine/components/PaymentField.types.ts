/**
 * Component state stored in session after pre-auth
 */
export interface PaymentState {
  paymentId: string
  reference: string
  amount: number
  description: string
  uuid: string
  formId: string
  isLivePayment: boolean
  payerEmail?: string
  capture?: {
    status: 'success' | 'failed'
    createdAt: string
  }
  preAuth?: {
    status: 'success' | 'failed' | 'started'
    createdAt: string
  }
}
