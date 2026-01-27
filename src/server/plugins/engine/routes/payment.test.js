import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import { getPaymentContext } from '~/src/server/plugins/engine/routes/payment-helper.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/plugins/engine/routes/payment-helper.js')

describe('Payment routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('Return route /payment-callback', () => {
    const uuid = '06a5b11e-e3e0-48a2-8ac3-56c0fcb6c20d'
    const options = {
      method: 'get',
      url: `/payment-callback?uuid=${uuid}`
    }

    const paymentSessionData = {
      uuid,
      formId: 'form-id',
      reference: 'form-ref-123',
      paymentId: 'payment-id',
      amount: 123,
      description: 'Payment desc',
      isLivePayment: false,
      componentName: 'my-component',
      returnUrl: 'http://host.com/return-url',
      failureUrl: 'http://host.com/failure-url'
    }
    const sessionKey = 'session-key'

    test.each([
      { status: 'capturable', finalUrl: 'http://host.com/return-url' },
      { status: 'success', finalUrl: 'http://host.com/return-url' },
      { status: 'cancelled', finalUrl: 'http://host.com/failure-url' },
      { status: 'failed', finalUrl: 'http://host.com/failure-url' },
      { status: 'error', finalUrl: 'http://host.com/failure-url' },
      { status: 'created', finalUrl: '/next-url' },
      { status: 'started', finalUrl: '/next-url' },
      { status: 'submitted', finalUrl: '/next-url' }
    ])('should handle payment status of $row.status', async (row) => {
      const paymentStatus = {
        paymentId: 'new-payment-id',
        // TODO - resolve name mismatch
        payment_id: 'new-payment-id',
        _links: {
          next_url: {
            href: '/next-url',
            method: 'get'
          },
          self: {
            href: '/self',
            method: 'get'
          }
        },
        state: /** @type {PaymentState} */ ({
          status: row.status,
          finished: true
        })
      }
      jest.mocked(getPaymentContext).mockResolvedValueOnce({
        session: paymentSessionData,
        sessionKey,
        paymentStatus
      })
      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(row.finalUrl)
    })

    it('should throw if nextUrl is missing', async () => {
      const paymentStatus = {
        paymentId: 'new-payment-id',
        // TODO - resolve name mismatch
        payment_id: 'new-payment-id',
        _links: {
          next_url: {},
          self: {
            href: '/self',
            method: 'get'
          }
        },
        state: /** @type {PaymentState} */ ({
          status: 'created',
          finished: true
        })
      }
      jest.mocked(getPaymentContext).mockResolvedValueOnce({
        session: paymentSessionData,
        sessionKey,
        // @ts-expect-error - missing elements deliberately for test
        paymentStatus
      })
      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
      // @ts-expect-error - error object
      expect(response.result?.message).toBe(
        "Payment in state 'created' but no next_url available"
      )
    })

    it('should throw if invalid status', async () => {
      const paymentStatus = {
        paymentId: 'new-payment-id',
        // TODO - resolve name mismatch
        payment_id: 'new-payment-id',
        _links: {
          next_url: {
            href: '/next-url',
            method: 'get'
          },
          self: {
            href: '/self',
            method: 'get'
          }
        },
        state: {
          status: 'invalid',
          finished: true
        }
      }
      jest.mocked(getPaymentContext).mockResolvedValueOnce({
        session: paymentSessionData,
        sessionKey,
        // @ts-expect-error - invalid status deliberately for test
        paymentStatus
      })
      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      // @ts-expect-error - error object
      expect(response.result?.message).toBe('Unknown payment status: invalid')
    })

    it('should handle payment with email from GOV.UK Pay response', async () => {
      const paymentStatus = {
        paymentId: 'new-payment-id',
        payment_id: 'new-payment-id',
        email: 'payer@example.com',
        _links: {
          next_url: {
            href: '/next-url',
            method: 'get'
          },
          self: {
            href: '/self',
            method: 'get'
          }
        },
        state: /** @type {PaymentState} */ ({
          status: 'success',
          finished: true
        })
      }
      jest.mocked(getPaymentContext).mockResolvedValueOnce({
        session: paymentSessionData,
        sessionKey,
        paymentStatus
      })
      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe('http://host.com/return-url')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { PaymentState } from '~/src/server/plugins/payment/types.js'
 */
