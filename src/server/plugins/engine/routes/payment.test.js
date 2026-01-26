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
      { status: 'error', finalUrl: 'http://host.com/failure-url' }
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
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { PaymentState } from '~/src/server/plugins/payment/types.js'
 */
