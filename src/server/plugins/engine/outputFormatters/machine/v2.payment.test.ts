/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { type PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'
import {
  SummaryPageController,
  getFormSubmissionData
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { FormStatus } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/payment.js'

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

const model = new FormModel(definition, {
  basePath: 'test'
})

const formStatus = {
  isPreview: false,
  state: FormStatus.Live
}

const state = {
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
      createdAt: '2026-01-02T11:00:04+0000'
    }
  } as PaymentState
}

const pageUrl = new URL('http://example.com/repeat/pizza-order/summary')

const request = buildFormContextRequest({
  method: 'get',
  url: pageUrl,
  path: pageUrl.pathname,
  params: {
    path: 'summary',
    slug: 'payment'
  },
  query: {},
  app: { model }
})

const context = model.getFormContext(request, state)

const pageDef = definition.pages[2]

const controller = new SummaryPageController(model, pageDef)

const summaryViewModel = controller.getSummaryViewModel(request, context)

const items = getFormSubmissionData(
  summaryViewModel.context,
  summaryViewModel.details
)

describe('getPersonalisation', () => {
  it('should return the machine output', () => {
    model.def = definition

    const body = format(context, items, model, submitResponse, formStatus)

    const parsedBody = JSON.parse(body)

    const expectedData = {
      main: {
        licenceLength: 365,
        fullName: 'John Smith'
      },
      payments: {
        paymentField: {
          amount: 250,
          createdAt: '2026-01-02T11:00:04+0000',
          description: 'Payment desc',
          paymentId: 'payment-id',
          reference: 'payment-ref'
        }
      },
      repeaters: {},
      files: {}
    }

    expect(parsedBody.meta.schemaVersion).toBe('2')
    expect(parsedBody.meta.timestamp).toBeDateString()
    expect(parsedBody.meta.definition).toEqual(definition)
    expect(parsedBody.meta.referenceNumber).toBe('foobar')
    expect(parsedBody.data).toEqual(expectedData)
  })
})
