import { addDays, format as dateFormat } from 'date-fns'
import { outdent } from 'outdent'

import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/human/v1.js'
import {
  SummaryPageController,
  getFormSubmissionData
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { FormStatus } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/repeat-mixed.js'

const itemId1 = 'abc-123'
const itemId2 = 'xyz-987'

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

const state = {
  $$__referenceNumber: 'foobar',
  orderType: 'delivery',
  pizza: [
    {
      toppings: 'Ham',
      quantity: 2,
      itemId: itemId1
    },
    {
      toppings: 'Pepperoni',
      quantity: 1,
      itemId: itemId2
    }
  ]
}

const pageDef = definition.pages[2]
const pageUrl = new URL('http://example.com/repeat/pizza-order/summary')

const controller = new SummaryPageController(model, pageDef)

const request = buildFormContextRequest({
  method: 'get',
  url: pageUrl,
  path: pageUrl.pathname,
  params: {
    path: 'pizza-order',
    slug: 'repeat'
  },
  query: {},
  app: { model }
})

const context = model.getFormContext(request, state)
const summaryViewModel = controller.getSummaryViewModel(request, context)

const items = getFormSubmissionData(
  summaryViewModel.context,
  summaryViewModel.details
)

describe('getPersonalisation', () => {
  it.each([
    {
      state: FormStatus.Live,
      isPreview: false
    },
    {
      state: FormStatus.Draft,
      isPreview: true
    }
  ])('should personalise $state email', (formStatus) => {
    const body = format(context, items, model, submitResponse, formStatus)

    const dateNow = new Date()
    const dateExpiry = addDays(dateNow, 90)

    // Check for link expiry message
    expect(body).toContain(
      `^ For security reasons, the links in this email expire at ${dateFormat(dateExpiry, 'h:mmaaa')} on ${dateFormat(dateExpiry, 'eeee d MMMM yyyy')}`
    )

    expect(body).toContain(
      outdent`
            ${definition.name} form received at ${dateFormat(dateNow, 'h:mmaaa')} on ${dateFormat(dateNow, 'd MMMM yyyy')}.

            ---

            ## How would you like to receive your pizza?

            Delivery

            ---

            ## Pizza

            [Download Pizza \\(CSV\\)](https://forms-designer/file-download/11111111-1111-1111-1111-111111111111)

            ---

            [Download main form \\(CSV\\)](https://forms-designer/file-download/00000000-0000-0000-0000-000000000000)
          `
    )
  })

  it('should add test warnings to preview email only', () => {
    const formStatus = {
      state: FormStatus.Draft,
      isPreview: true
    }

    const body1 = format(context, items, model, submitResponse, {
      state: FormStatus.Live,
      isPreview: false
    })

    const body2 = format(context, items, model, submitResponse, {
      state: FormStatus.Draft,
      isPreview: true
    })

    expect(body1).not.toContain(
      `This is a test of the ${definition.name} ${formStatus.state} form`
    )

    expect(body2).toContain(
      `This is a test of the ${definition.name} ${formStatus.state} form`
    )
  })
})
