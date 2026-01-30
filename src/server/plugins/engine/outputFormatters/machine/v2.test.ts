/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { FileUploadField } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { type Field } from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField,
  type DetailItemRepeat
} from '~/src/server/plugins/engine/models/types.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'
import {
  SummaryPageController,
  getFormSubmissionData
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import {
  FileStatus,
  UploadStatus,
  type FileState
} from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/repeat-mixed.js'

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

const dummyField: Field = {
  getFormValueFromState: (_) => 'hello world'
} as Field

const itemId1 = 'abc-123'
const itemId2 = 'xyz-987'

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

const pageUrl = new URL('http://example.com/repeat/pizza-order/summary')

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

const testDetailItemField: DetailItemField = {
  name: 'exampleField',
  label: 'Example Field',
  href: '/example-field',
  title: 'Example Field Title',
  field: dummyField,
  value: 'Example Value'
} as DetailItemField

const testDetailItemField2: DetailItemField = {
  name: 'exampleField2',
  label: 'Example Field 2',
  href: '/example-field 2',
  title: 'Example Field 2 Title',
  field: dummyField,
  value: 'Example Value 2'
} as DetailItemField

const testDetailItemRepeat: DetailItemRepeat = {
  name: 'exampleRepeat',
  label: 'Example Repeat',
  href: '/example-repeat',
  title: 'Example Repeat Title',
  value: 'Example Repeat Value',
  subItems: [
    [
      {
        name: 'subItem1_1',
        label: 'Sub Item 1 1',
        field: dummyField,
        href: '/sub-item-1-1',
        title: 'Sub Item 1 1 Title',
        value: 'Sub Item 1 1 Value'
      } as DetailItemField,
      {
        name: 'subItem1_2',
        label: 'Sub Item 1 2',
        field: dummyField,
        href: '/sub-item-1-2',
        title: 'Sub Item 1 2 Title',
        value: 'Sub Item 1 2 Value'
      } as DetailItemField
    ],
    [
      {
        name: 'subItem2_1',
        label: 'Sub Item 2 1',
        field: dummyField,
        href: '/sub-item-2 1',
        title: 'Sub Item 2 1 Title',
        value: 'Sub Item 2 1 Value'
      } as DetailItemField
    ]
  ]
} as DetailItemRepeat

const testDetailItemRepeat2: DetailItemRepeat = {
  name: 'exampleRepeat2',
  label: 'Example Repeat 2',
  href: '/example-repeat-2',
  title: 'Example Repeat 2 Title',
  value: 'Example Repeat 2 Value',
  subItems: [
    [
      {
        name: 'subItem1_1',
        label: 'Sub Item 1 1',
        field: dummyField,
        href: '/sub-item-1-1',
        title: 'Sub Item 1 1 Title',
        value: 'Sub Item 1 1 Value'
      } as DetailItemField
    ]
  ]
} as DetailItemRepeat

const fileState: FileState = {
  uploadId: '123',
  status: {
    form: {
      file: {
        fileId: '123-456-789',
        contentLength: 1,
        filename: 'foobar.txt',
        fileStatus: FileStatus.complete
      }
    },
    uploadStatus: UploadStatus.ready,
    numberOfRejectedFiles: 0,
    metadata: {
      retrievalKey: '123'
    }
  }
}

const fileState2: FileState = {
  uploadId: '456',
  status: {
    form: {
      file: {
        fileId: '456-789-123',
        contentLength: 1,
        filename: 'bazbuzz.txt',
        fileStatus: FileStatus.complete
      }
    },
    uploadStatus: UploadStatus.ready,
    numberOfRejectedFiles: 0,
    metadata: {
      retrievalKey: '123'
    }
  }
}

const testDetailItemFile1: DetailItemField = Object.create(
  FileUploadField.prototype
)
Object.assign(testDetailItemFile1, {
  name: 'exampleFile1',
  label: 'Example Field',
  href: '/example-field',
  title: 'Example Field Title',
  field: testDetailItemFile1,
  value: 'Example Value',
  state: {
    exampleFile1: [fileState, fileState2]
  }
})

const items: DetailItem[] = [
  testDetailItemField,
  testDetailItemField2,
  testDetailItemRepeat,
  testDetailItemRepeat2,
  testDetailItemFile1
]

describe('getPersonalisation', () => {
  it('should return the machine output', () => {
    model.def = definition

    const body = format(context, items, model, submitResponse, formStatus)

    const parsedBody = JSON.parse(body)

    const expectedData = {
      main: {
        exampleField: 'hello world',
        exampleField2: 'hello world'
      },
      repeaters: {
        exampleRepeat: [
          {
            subItem1_1: 'hello world',
            subItem1_2: 'hello world'
          },
          {
            subItem2_1: 'hello world'
          }
        ],
        exampleRepeat2: [
          {
            subItem1_1: 'hello world'
          }
        ]
      },
      files: {
        exampleFile1: [
          {
            fileId: '123-456-789',
            fileName: 'foobar.txt',
            userDownloadLink: 'https://forms-designer/file-download/123-456-789'
          },
          {
            fileId: '456-789-123',
            fileName: 'bazbuzz.txt',
            userDownloadLink: 'https://forms-designer/file-download/456-789-123'
          }
        ]
      }
    }

    expect(parsedBody.meta.schemaVersion).toBe('2')
    expect(parsedBody.meta.timestamp).toBeDateString()
    expect(parsedBody.meta.definition).toEqual(definition)
    expect(parsedBody.meta.referenceNumber).toBe('foobar')
    expect(parsedBody.data).toEqual(expectedData)
  })

  it('should return the machine output 2', () => {
    const pageDef = definition.pages[2]
    const controller = new SummaryPageController(model, pageDef)

    const summaryViewModel = controller.getSummaryViewModel(request, context)

    const items = getFormSubmissionData(
      summaryViewModel.context,
      summaryViewModel.details
    )

    const body = format(context, items, model, submitResponse, formStatus)

    const parsedBody = JSON.parse(body)

    const expectedData = {
      main: {
        orderType: 'delivery'
      },
      repeaters: {
        pizza: [
          {
            quantity: 2,
            toppings: 'Ham'
          },
          {
            quantity: 1,
            toppings: 'Pepperoni'
          }
        ]
      },
      files: {}
    }

    expect(parsedBody.data).toEqual(expectedData)
  })
})
