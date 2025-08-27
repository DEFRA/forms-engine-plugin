import { type FormMetadata } from '@defra/forms-model'

import { escapeMarkdown } from '~/src/server/plugins/engine/components/helpers.js'
import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { getFormatter } from '~/src/server/plugins/engine/outputFormatters/index.js'
import { submit } from '~/src/server/plugins/engine/services/notifyService.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import {
  FormStatus,
  type FormRequestPayload
} from '~/src/server/routes/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'

jest.mock('~/src/server/utils/notify')
jest.mock('~/src/server/plugins/engine/helpers')
jest.mock('~/src/server/plugins/engine/outputFormatters/index')
jest.mock('~/src/server/plugins/engine/components/helpers')

describe('notifyService', () => {
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

  const items: DetailItem[] = []

  const mockRequest: FormRequestPayload = jest.mocked<FormRequestPayload>({
    path: 'test',
    logger: {
      info: jest.fn(),
      error: jest.fn()
    }
  } as unknown as FormRequestPayload)
  let model: FormModel
  const sendNotificationMock = jest.mocked(sendNotification)
  const formContext = {} as FormContext

  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(escapeMarkdown).mockImplementation((text) => text)
  })

  it('creates a subject line for real forms', async () => {
    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'human',
          version: '1'
        }
      }
    } as FormModel

    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: false,
      state: FormStatus.Draft
    })
    jest.mocked(getFormatter).mockReturnValue(() => 'dummy-live')

    await submit(
      formContext,
      mockRequest,
      model,
      'test@defra.gov.uk',
      items,
      submitResponse
    )

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: `Form submission: foobar`,
          body: 'dummy-live'
        }
      })
    )
  })

  it('creates a subject line for preview forms', async () => {
    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'human',
          version: '1'
        }
      }
    } as FormModel

    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: true,
      state: FormStatus.Draft
    })
    jest.mocked(getFormatter).mockReturnValue(() => 'dummy-preview')

    await submit(
      formContext,
      mockRequest,
      model,
      'test@defra.gov.uk',
      items,
      submitResponse
    )

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: `TEST FORM SUBMISSION: foobar`,
          body: 'dummy-preview'
        }
      })
    )
  })

  it('base64 encodes form data when aimed at machines', async () => {
    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'machine',
          version: '1'
        }
      }
    } as FormModel

    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: true,
      state: FormStatus.Draft
    })
    jest
      .mocked(getFormatter)
      .mockReturnValue(() => 'dummy-preview " Hello world \' !@/')

    await submit(
      formContext,
      mockRequest,
      model,
      'test@defra.gov.uk',
      items,
      submitResponse
    )

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: `TEST FORM SUBMISSION: foobar`,
          body: 'ZHVtbXktcHJldmlldyAiIEhlbGxvIHdvcmxkICcgIUAv'
        }
      })
    )
  })

  it('calls outputFormatter with all correct arguments', async () => {
    const mockFormatter = jest.fn().mockReturnValue('formatted-output')
    jest.mocked(getFormatter).mockReturnValue(mockFormatter)

    const formMetadata: FormMetadata = {
      id: 'form-id',
      slug: 'form-slug',
      title: 'Form Title'
    } as FormMetadata

    const formStatus = {
      isPreview: false,
      state: FormStatus.Live
    }

    jest.mocked(checkFormStatus).mockReturnValue(formStatus)

    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'human',
          version: '1'
        }
      }
    } as FormModel

    await submit(
      formContext,
      mockRequest,
      model,
      'test@defra.gov.uk',
      items,
      submitResponse,
      formMetadata
    )

    expect(getFormatter).toHaveBeenCalledWith('human', '1')

    expect(mockFormatter).toHaveBeenCalledWith(
      formContext,
      items,
      model,
      submitResponse,
      formStatus,
      formMetadata
    )

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: 'Form submission: foobar',
          body: 'formatted-output'
        }
      })
    )
  })

  it('calls outputFormatter without formMetadata when not provided', async () => {
    const mockFormatter = jest.fn().mockReturnValue('formatted-output')
    jest.mocked(getFormatter).mockReturnValue(mockFormatter)

    const formStatus = {
      isPreview: true,
      state: FormStatus.Draft
    }

    jest.mocked(checkFormStatus).mockReturnValue(formStatus)

    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'machine',
          version: '2'
        }
      }
    } as FormModel

    await submit(
      formContext,
      mockRequest,
      model,
      'test@defra.gov.uk',
      items,
      submitResponse
    )

    expect(getFormatter).toHaveBeenCalledWith('machine', '2')

    expect(mockFormatter).toHaveBeenCalledWith(
      formContext,
      items,
      model,
      submitResponse,
      formStatus,
      undefined
    )

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: 'TEST FORM SUBMISSION: foobar',
          body: Buffer.from('formatted-output').toString('base64')
        }
      })
    )
  })

  it('should handle sendNotification errors and rethrow', async () => {
    const mockFormatter = jest.fn().mockReturnValue('formatted-output')
    jest.mocked(getFormatter).mockReturnValue(mockFormatter)
    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: false,
      state: FormStatus.Live
    })

    const testError = new Error('Notification service unavailable')
    sendNotificationMock.mockRejectedValue(testError)

    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'human',
          version: '1'
        }
      }
    } as FormModel

    await expect(
      submit(
        formContext,
        mockRequest,
        model,
        'test@defra.gov.uk',
        items,
        submitResponse
      )
    ).rejects.toThrow('Notification service unavailable')

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      'Notification service unavailable',
      expect.stringContaining(
        '[emailSendFailed] Error sending notification email'
      )
    )
  })
})
