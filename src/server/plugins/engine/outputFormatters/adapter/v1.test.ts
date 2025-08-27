import { type FormMetadata } from '@defra/forms-model'

import { FileUploadField } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { type Field } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField,
  type DetailItemRepeat
} from '~/src/server/plugins/engine/models/types.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/adapter/v1.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import {
  FileStatus,
  FormAdapterSubmissionSchemaVersion,
  UploadStatus,
  type FileState,
  type FormAdapterSubmissionMessagePayload
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
  href: '/example-field-2',
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
        href: '/sub-item-2-1',
        title: 'Sub Item 2 1 Title',
        value: 'Sub Item 2 1 Value'
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
      retrievalKey: '456'
    }
  }
}

const testDetailItemFile1: DetailItemField = Object.create(
  FileUploadField.prototype
)
Object.assign(testDetailItemFile1, {
  name: 'exampleFile1',
  label: 'Example File Field',
  href: '/example-file',
  title: 'Example File Field Title',
  field: testDetailItemFile1,
  value: 'Example File Value',
  state: {
    exampleFile1: [fileState, fileState2]
  }
})

const items: DetailItem[] = [
  testDetailItemField,
  testDetailItemField2,
  testDetailItemRepeat,
  testDetailItemFile1
]

describe('Adapter v1 formatter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return the adapter v1 output with complete formMetadata', () => {
    const formMetadata: FormMetadata = {
      id: 'form-123',
      slug: 'test-form',
      title: 'Test Form',
      notificationEmail: 'test@example.com'
    } as FormMetadata

    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(
      context,
      items,
      model,
      submitResponse,
      formStatus,
      formMetadata
    )
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta).toEqual({
      schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
      timestamp: '2024-01-15T10:30:00.000Z',
      referenceNumber: 'foobar',
      formName: definition.name,
      formId: 'form-123',
      formSlug: 'test-form',
      status: FormStatus.Live,
      isPreview: false,
      notificationEmail: 'test@example.com'
    })

    expect(parsedBody.data).toEqual({
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
        ]
      },
      files: {
        exampleFile1: [
          {
            fileId: '123-456-789',
            userDownloadLink: 'https://forms-designer/file-download/123-456-789'
          },
          {
            fileId: '456-789-123',
            userDownloadLink: 'https://forms-designer/file-download/456-789-123'
          }
        ]
      }
    })
  })

  it('should handle preview form status correctly', () => {
    const formMetadata: FormMetadata = {
      id: 'form-123',
      slug: 'test-form',
      title: 'Test Form',
      notificationEmail: 'test@example.com'
    } as FormMetadata

    const formStatus = {
      isPreview: true,
      state: FormStatus.Draft
    }

    const body = format(
      context,
      items,
      model,
      submitResponse,
      formStatus,
      formMetadata
    )
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.status).toBe(FormStatus.Draft)
    expect(parsedBody.meta.isPreview).toBe(true)
  })

  it('should handle missing formMetadata with empty strings', () => {
    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(context, items, model, submitResponse, formStatus)
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.formId).toBe('')
    expect(parsedBody.meta.formSlug).toBe('')
    expect(parsedBody.meta.notificationEmail).toBe('')
    expect(parsedBody.meta.formName).toBe(definition.name)
    expect(parsedBody.meta.referenceNumber).toBe('foobar')
  })

  it('should handle partial formMetadata', () => {
    const formMetadata: FormMetadata = {
      id: 'form-456',
      slug: 'partial-form',
      title: 'Partial Form'
    } as FormMetadata

    const formStatus = {
      isPreview: true,
      state: FormStatus.Draft
    }

    const body = format(
      context,
      items,
      model,
      submitResponse,
      formStatus,
      formMetadata
    )
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.formId).toBe('form-456')
    expect(parsedBody.meta.formSlug).toBe('partial-form')
    expect(parsedBody.meta.notificationEmail).toBe('')
    expect(parsedBody.meta.status).toBe(FormStatus.Draft)
    expect(parsedBody.meta.isPreview).toBe(true)
  })

  it('should use correct schema version', () => {
    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(context, items, model, submitResponse, formStatus)
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.schemaVersion).toBe(
      FormAdapterSubmissionSchemaVersion.V1
    )
    expect(parsedBody.meta.schemaVersion).toBe(1)
  })

  it('should generate valid timestamp', () => {
    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(context, items, model, submitResponse, formStatus)
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.timestamp).toBe('2024-01-15T10:30:00.000Z')
    expect(typeof parsedBody.meta.timestamp).toBe('string')

    expect(new Date(parsedBody.meta.timestamp)).toEqual(
      new Date('2024-01-15T10:30:00.000Z')
    )
  })

  it('should handle empty items array', () => {
    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(context, [], model, submitResponse, formStatus)
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.data.main).toEqual({})
    expect(parsedBody.data.repeaters).toEqual({})
    expect(parsedBody.data.files).toEqual({})
  })

  it('should handle different form statuses', () => {
    const testCases = [
      {
        isPreview: false,
        state: FormStatus.Live,
        expectedStatus: FormStatus.Live
      },
      {
        isPreview: true,
        state: FormStatus.Draft,
        expectedStatus: FormStatus.Draft
      },
      {
        isPreview: true,
        state: FormStatus.Live,
        expectedStatus: FormStatus.Draft
      }
    ]

    testCases.forEach(({ isPreview, state, expectedStatus }) => {
      const formStatus = { isPreview, state }
      const body = format(context, items, model, submitResponse, formStatus)
      const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

      expect(parsedBody.meta.status).toBe(expectedStatus)
      expect(parsedBody.meta.isPreview).toBe(isPreview)
    })
  })

  it('should return valid JSON string', () => {
    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(context, items, model, submitResponse, formStatus)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    expect(() => JSON.parse(body)).not.toThrow()
    expect(typeof body).toBe('string')
  })

  it('should handle formMetadata with only id', () => {
    const formMetadata: FormMetadata = {
      id: 'only-id-form'
    } as FormMetadata

    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(
      context,
      items,
      model,
      submitResponse,
      formStatus,
      formMetadata
    )
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.formId).toBe('only-id-form')
    expect(parsedBody.meta.formSlug).toBe('')
    expect(parsedBody.meta.notificationEmail).toBe('')
  })

  it('should handle formMetadata with only slug', () => {
    const formMetadata: FormMetadata = {
      slug: 'only-slug-form'
    } as FormMetadata

    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(
      context,
      items,
      model,
      submitResponse,
      formStatus,
      formMetadata
    )
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.formId).toBe('')
    expect(parsedBody.meta.formSlug).toBe('only-slug-form')
    expect(parsedBody.meta.notificationEmail).toBe('')
  })

  it('should handle formMetadata with only notificationEmail', () => {
    const formMetadata: FormMetadata = {
      notificationEmail: 'only-email@example.com'
    } as FormMetadata

    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    const body = format(
      context,
      items,
      model,
      submitResponse,
      formStatus,
      formMetadata
    )
    const parsedBody = JSON.parse(body) as FormAdapterSubmissionMessagePayload

    expect(parsedBody.meta.formId).toBe('')
    expect(parsedBody.meta.formSlug).toBe('')
    expect(parsedBody.meta.notificationEmail).toBe('only-email@example.com')
  })
})
