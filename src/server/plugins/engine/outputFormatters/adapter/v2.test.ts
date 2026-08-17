import {
  type FormDefinition,
  type FormMetadata,
  type Output,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { type Field } from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField
} from '~/src/server/plugins/engine/models/types.js'
import { format as formatV1 } from '~/src/server/plugins/engine/outputFormatters/adapter/v1.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/adapter/v2.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/index.js'
import { formAdapterSubmissionMessagePayloadSchema } from '~/src/server/plugins/engine/types/schema.js'
import { type FormAdapterSubmissionMessagePayload } from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/repeat-mixed.js'

const submitResponse = {
  message: 'Submit completed',
  result: {
    files: {
      main: '00000000-0000-0000-0000-000000000000',
      repeaters: {
        exampleRepeat: '11111111-1111-1111-1111-111111111111'
      }
    }
  }
} as SubmitResponsePayload

const formStatus = {
  isPreview: false,
  state: FormStatus.Live
}

const dummyField: Field = {
  getFormValueFromState: (_) => 'hello world'
} as Field

const items: DetailItem[] = [
  {
    name: 'exampleField',
    label: 'Example Field',
    href: '/example-field',
    title: 'Example Field Title',
    field: dummyField,
    value: 'Example Value'
  } as DetailItemField
]

const model = new FormModel(definition, { basePath: 'test' })

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

const context = model.getFormContext(request, {
  $$__referenceNumber: 'foobar',
  orderType: 'delivery'
})

/**
 * Formats against a copy of the definition carrying the given outputs, so the
 * shared `model` is left alone for the other tests in this file.
 */
function formatWith(
  outputs?: Output[],
  output?: FormDefinition['output'],
  notificationEmail = 'submissions@example.com'
) {
  const withOutputs = new FormModel(
    { ...definition, outputs, output },
    { basePath: 'test' }
  )

  const body = format(context, items, withOutputs, submitResponse, formStatus, {
    id: '68a8b0449ab460290c28940a',
    slug: 'order-a-pizza',
    notificationEmail
  } as FormMetadata)

  return JSON.parse(body) as FormAdapterSubmissionMessagePayload
}

describe('Adapter v2 formatter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is the v1 payload plus notificationTargets', () => {
    const formMetadata = {
      id: '68a8b0449ab460290c28940a',
      slug: 'order-a-pizza',
      notificationEmail: 'submissions@example.com'
    } as FormMetadata

    const v1 = JSON.parse(
      formatV1(context, items, model, submitResponse, formStatus, formMetadata)
    ) as FormAdapterSubmissionMessagePayload

    const { notificationTargets, ...rest } = JSON.parse(
      format(context, items, model, submitResponse, formStatus, formMetadata)
    ) as FormAdapterSubmissionMessagePayload

    expect(notificationTargets).toBeDefined()
    expect(rest).toEqual({
      ...v1,
      meta: {
        ...v1.meta,
        schemaVersion: FormAdapterSubmissionSchemaVersion.V2
      }
    })
  })

  it('leaves v1 emitting the v1 schema version', () => {
    const v1 = JSON.parse(
      formatV1(context, items, model, submitResponse, formStatus)
    ) as FormAdapterSubmissionMessagePayload

    expect(v1.meta.schemaVersion).toBe(FormAdapterSubmissionSchemaVersion.V1)
    expect(v1.notificationTargets).toBeUndefined()
  })

  describe('notificationTargets', () => {
    it('always includes the form notification email', () => {
      expect(formatWith().notificationTargets).toEqual([
        {
          emailAddress: 'submissions@example.com',
          audience: 'human',
          version: '2'
        }
      ])
    })

    it('falls back to human v2 for the notification email', () => {
      // forms-notify-listener has always defaulted a form with no explicit
      // `output` to human v2. Defaulting to v1 here would silently change the
      // format every such form is sent in.
      expect(formatWith().notificationTargets?.[0]).toMatchObject({
        audience: 'human',
        version: '2'
      })
    })

    it('honours an explicit output audience and version', () => {
      const targets = formatWith(undefined, {
        audience: 'machine',
        version: '1'
      }).notificationTargets

      expect(targets?.[0]).toMatchObject({ audience: 'machine', version: '1' })
    })

    it('includes unconditional outputs alongside the notification email', () => {
      const targets = formatWith([
        { emailAddress: 'team@example.com', audience: 'machine', version: '2' }
      ]).notificationTargets

      expect(targets).toEqual([
        {
          emailAddress: 'submissions@example.com',
          audience: 'human',
          version: '2'
        },
        { emailAddress: 'team@example.com', audience: 'machine', version: '2' }
      ])
    })

    it('emits no progress state - that is the adapter’s to write', () => {
      const targets = formatWith([
        { emailAddress: 'team@example.com', audience: 'human', version: '2' }
      ]).notificationTargets

      for (const target of targets ?? []) {
        expect(target).not.toHaveProperty('sent')
        expect(target).not.toHaveProperty('sendAttempts')
        expect(target).not.toHaveProperty('type')
      }
    })

    // Condition evaluation itself is covered against buildNotificationTargets
    // in pageControllers/helpers/submission.test.ts - the formatter only wires
    // it up, and this file's fixture is a V1 definition, which rejects
    // conditioned outputs outright.

    it('produces a payload the schema accepts', () => {
      const payload = formatWith([
        { emailAddress: 'team@example.com', audience: 'machine', version: '2' }
      ])

      // The runner publishes with allowUnknown: false and throws on failure,
      // so a formatter and schema that disagree would fail every submission
      const { error } = formAdapterSubmissionMessagePayloadSchema.validate(
        payload,
        { abortEarly: false, allowUnknown: false }
      )

      expect(error).toBeUndefined()
    })
  })
})
