import { format as dateFormat } from 'date-fns'
import { outdent } from 'outdent'

import { type PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/human/v1.js'
import {
  SummaryPageController,
  getFormSubmissionData
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import definitionPayment from '~/test/form/definitions/payment.js'

describe('v1 human formatter', () => {
  describe('Payment', () => {
    const modelPayment = new FormModel(definitionPayment, {
      basePath: 'test'
    })

    const submitResponse = {
      message: 'Submit completed',
      result: {
        files: {
          main: '00000000-0000-0000-0000-000000000000',
          repeaters: {
            pizza: '11111111-1111-1111-1111-111111111111'
          }
        }
      }
    }

    const statePayment = {
      $$__referenceNumber: 'foobar',
      licenceLength: 365,
      fullName: 'John Smith',
      paymentField: {
        paymentId: 'payment-id',
        reference: 'payment-ref',
        amount: 250,
        description: 'Payment desc',
        uuid: 'uuid',
        formId: 'form-id',
        isLivePayment: false,
        preAuth: {
          status: 'success',
          createdAt: '2026-01-02T11:02:04+0000'
        }
      } as PaymentState
    }

    const pageUrl = new URL('http://example.com/repeat/pizza-order/summary')

    const requestPayment = buildFormContextRequest({
      method: 'get',
      url: pageUrl,
      path: pageUrl.pathname,
      params: {
        path: 'summary',
        slug: 'payment'
      },
      query: {},
      app: { model: modelPayment }
    })

    const pageDefPayment = definitionPayment.pages[2]

    const controllerPayment = new SummaryPageController(
      modelPayment,
      pageDefPayment
    )

    const contextPayment = modelPayment.getFormContext(
      requestPayment,
      statePayment as unknown as FormSubmissionState
    )
    const summaryViewModelPayment = controllerPayment.getSummaryViewModel(
      requestPayment,
      contextPayment
    )

    const itemsPayment = getFormSubmissionData(
      summaryViewModelPayment.context,
      summaryViewModelPayment.details
    )

    it('should add payment details', () => {
      const body = format(
        contextPayment,
        itemsPayment,
        modelPayment,
        submitResponse,
        {
          state: FormStatus.Draft,
          isPreview: true
        }
      )

      const dateNow = new Date()

      expect(body).toContain(
        outdent`
              ${definitionPayment.name} form received at ${dateFormat(dateNow, 'h:mmaaa')} on ${dateFormat(dateNow, 'd MMMM yyyy')}.

              ---

              ## Which fishing licence do you want to get?

              12 months \\(365\\)

              ---

              ## What\\'s your name?

              John Smith

              ---

              [Download main form \\(CSV\\)](https://forms-designer/file-download/00000000-0000-0000-0000-000000000000)

              ---

              # Your payment of £250.00 was successful

              ## Payment for

              Payment desc

              ---

              ## Total amount

              £250.00

              ---

              ## Date of payment

              2 January 2026 11:02am

              ---
            `
      )
    })
  })
})
