import { PaymentService } from '~/src/server/plugins/payment/service.js'
import { get, post, postJson } from '~/src/server/services/httpService.js'

jest.mock('~/src/server/services/httpService.ts')

describe('payment service', () => {
  const service = new PaymentService('my-api-key')
  describe('constructor', () => {
    it('should create instance', () => {
      expect(service).toBeDefined()
    })
  })

  describe('createPayment', () => {
    it('should create a payment', async () => {
      const createPaymentResult = {
        payment_id: 'payment-id-12345',
        _links: {
          next_url: {
            href: 'http://next-url-href/payment'
          }
        },
        state: {
          status: 'created'
        }
      }
      jest.mocked(postJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: createPaymentResult,
        error: undefined
      })

      const referenceNumber = 'ABC-DEF-123'
      const returnUrl = 'http://localhost:3009/payment-callback-handler'
      const metadata = { formId: 'form-id', slug: 'my-form-slug' }
      const payment = await service.createPayment(
        100,
        'Payment description',
        returnUrl,
        referenceNumber,
        false,
        metadata
      )
      expect(payment.paymentId).toBe('payment-id-12345')
      expect(payment.paymentUrl).toBe('http://next-url-href/payment')
    })

    it('should throw if fails to create a payment - failed API call', async () => {
      jest
        .mocked(postJson)
        .mockRejectedValueOnce(new Error('internal creation error'))

      const referenceNumber = 'ABC-DEF-123'
      const returnUrl = 'http://localhost:3009/payment-callback-handler'
      const metadata = { formId: 'form-id', slug: 'my-form-slug' }
      await expect(() =>
        service.createPayment(
          100,
          'Payment description',
          returnUrl,
          referenceNumber,
          false,
          metadata
        )
      ).rejects.toThrow('internal creation error')
    })

    it('should throw if fails to create a payment - bad result from API call', async () => {
      const createPaymentResult = {
        state: {
          status: 'failed'
        }
      }
      jest.mocked(postJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: createPaymentResult,
        error: undefined
      })

      const referenceNumber = 'ABC-DEF-123'
      const returnUrl = 'http://localhost:3009/payment-callback-handler'
      const metadata = { formId: 'form-id', slug: 'my-form-slug' }
      await expect(() =>
        service.createPayment(
          100,
          'Payment description',
          returnUrl,
          referenceNumber,
          false,
          metadata
        )
      ).rejects.toThrow('Failed to create payment')
    })
  })

  describe('getPaymentStatus', () => {
    it('should get payment status if exists', async () => {
      const getPaymentStatusResult = {
        payment_id: 'payment-id-12345',
        _links: {
          next_url: {
            href: 'http://next-url-href/payment'
          }
        },
        state: {
          status: 'created'
        }
      }

      jest.mocked(get).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: getPaymentStatusResult,
        error: undefined
      })

      const paymentStatus = await service.getPaymentStatus(
        'payment-id-12345',
        false
      )
      expect(paymentStatus.paymentId).toBe('payment-id-12345')
      expect(paymentStatus._links.next_url?.href).toBe(
        'http://next-url-href/payment'
      )
    })

    it('should handle payment status error', async () => {
      jest.mocked(get).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: undefined,
        error: new Error('some-error')
      })

      await expect(() =>
        service.getPaymentStatus('payment-id-12345', false)
      ).rejects.toThrow('Failed to get payment status: some-error')
    })
  })

  describe('capturePayment', () => {
    it('should return true when successful capture with statusCode 200', async () => {
      const capturePaymentResult = {}
      jest.mocked(post).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: capturePaymentResult,
        error: undefined
      })

      const captureResult = await service.capturePayment(
        'payment-id-12345',
        100
      )
      expect(captureResult).toBe(true)
    })

    it('should return true when successful capture with statusCode 204', async () => {
      const capturePaymentResult = {}
      jest.mocked(post).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 204,
          headers: {}
        }),
        payload: capturePaymentResult,
        error: undefined
      })

      const captureResult = await service.capturePayment(
        'payment-id-12345',
        100
      )
      expect(captureResult).toBe(true)
    })

    it('should return false when status code not 200 or 204', async () => {
      const capturePaymentResult = {}
      jest.mocked(post).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 500,
          headers: {}
        }),
        payload: capturePaymentResult,
        error: undefined
      })

      const captureResult = await service.capturePayment(
        'payment-id-12345',
        100
      )
      expect(captureResult).toBe(false)
    })

    it('should throw when internal error', async () => {
      jest
        .mocked(post)
        .mockRejectedValueOnce(new Error('internal capture error'))

      await expect(() =>
        service.capturePayment('payment-id-12345', 100)
      ).rejects.toThrow('internal capture error')
    })
  })
})

/**
 * @import  { IncomingMessage } from 'node:http'
 */
