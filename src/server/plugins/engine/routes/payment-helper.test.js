import { getPaymentContext } from '~/src/server/plugins/engine/routes/payment-helper.js'
import { get } from '~/src/server/services/httpService.js'

jest.mock('~/src/server/services/httpService.ts')

describe('payment helper', () => {
  const uuid = '5a54c2fe-da49-4202-8cd3-2121eaca03c3'
  it('should throw if no session', async () => {
    const mockRequest = {
      yar: {
        get: jest.fn().mockReturnValueOnce(undefined)
      }
    }
    // @ts-expect-error - partial request mock
    await expect(() => getPaymentContext(mockRequest, uuid)).rejects.toThrow(
      'No payment session found for uuid=5a54c2fe-da49-4202-8cd3-2121eaca03c3'
    )
  })

  it('should throw if no payment id', async () => {
    const mockRequest = {
      yar: {
        get: jest.fn().mockReturnValueOnce({})
      }
    }
    // @ts-expect-error - partial request mock
    await expect(() => getPaymentContext(mockRequest, uuid)).rejects.toThrow(
      'No paymentId in session'
    )
  })

  it('should get context successfully', async () => {
    const mockRequest = {
      yar: {
        get: jest.fn().mockReturnValueOnce({
          paymentId: 'payment-id',
          isLivePayment: false,
          formId: 'formid'
        })
      }
    }

    const getPaymentStatusApiResult = {
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
      payload: getPaymentStatusApiResult,
      error: undefined
    })

    // @ts-expect-error - partial request mock
    const res = await getPaymentContext(mockRequest, uuid)
    expect(res).toEqual({
      paymentStatus: {
        paymentId: 'payment-id-12345',
        _links: {
          next_url: {
            href: 'http://next-url-href/payment'
          }
        },
        state: {
          status: 'created'
        }
      },
      session: {
        formId: 'formid',
        isLivePayment: false,
        paymentId: 'payment-id'
      },
      sessionKey: 'payment-5a54c2fe-da49-4202-8cd3-2121eaca03c3'
    })
  })
})

/**
 * @import  { IncomingMessage } from 'node:http'
 */
