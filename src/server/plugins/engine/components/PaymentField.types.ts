/**
 * Component state stored in session after pre-auth
 */
export interface PaymentState {
  paymentId: string
  reference: string
  amount: number
  description: string
  capture?: {
    status: 'success' | 'failed'
    createdAt: string
  }
  preAuth?: {
    status: 'success' | 'failed' | 'started'
    createdAt: string
  }
}

/**
 * Response from GOV.UK Pay API
 */
export interface PaymentStatus {
  amount: number
  state: {
    status:
      | 'created'
      | 'started'
      | 'submitted'
      | 'capturable'
      | 'success'
      | 'failed'
      | 'cancelled'
      | 'error'
    finished: boolean
    message?: string
    code?: string
    canRetry?: boolean
  }
  createdDate: string
}

/**
 * Service interface for GOV.UK Pay integration
 */
export interface PaymentService {
  createPayment(
    amount: number,
    description: string,
    metadata: { formId: string; slug: string }
  ): Promise<{ paymentId: string; paymentUrl: string }>

  getPaymentStatus(paymentId: string): Promise<PaymentStatus>

  capturePayment(paymentId: string): Promise<boolean>
}
