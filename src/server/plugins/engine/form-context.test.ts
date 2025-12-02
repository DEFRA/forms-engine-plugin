import { type Request } from '@hapi/hapi'

import {
  getFirstJourneyPage,
  getFormContext,
  getFormModel
} from '~/src/server/plugins/engine/form-context.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import { type FormsService, type Services } from '~/src/server/types.js'

const mockGetCacheService = jest.fn()
const mockCacheService = { getState: jest.fn() }
const mockCheckEmailAddressForLiveFormSubmission = jest.fn()

jest.mock('~/src/server/plugins/engine/models/index.js', () => ({
  __esModule: true,
  FormModel: jest.fn()
}))

jest.mock('~/src/server/plugins/engine/services/index.js', () => ({
  __esModule: true,
  formsService: {
    getFormMetadata: jest.fn(),
    getFormDefinition: jest.fn()
  },
  formSubmissionService: {},
  outputService: {}
}))

jest.mock('~/src/server/plugins/engine/pageControllers/index.js', () => {
  class MockTerminalPageController {
    path = ''
  }

  return {
    __esModule: true,
    TerminalPageController: MockTerminalPageController
  }
})

jest.mock('~/src/server/plugins/engine/helpers.js', () => ({
  __esModule: true,
  getCacheService: (...args: unknown[]) => mockGetCacheService(...args),
  checkEmailAddressForLiveFormSubmission: (...args: unknown[]) =>
    mockCheckEmailAddressForLiveFormSubmission(...args)
}))

const mockServices = jest.requireMock(
  '~/src/server/plugins/engine/services/index.js'
)
const mockFormsService = mockServices.formsService
const { FormModel } = jest.requireMock(
  '~/src/server/plugins/engine/models/index.js'
)
const { TerminalPageController: MockTerminalPageController } = jest.requireMock(
  '~/src/server/plugins/engine/pageControllers/index.js'
)

describe('getFormContext helper', () => {
  const request = {
    yar: { set: jest.fn() } as unknown as Request['yar'],
    server: {
      app: {},
      realm: { modifiers: { route: { prefix: '' } } }
    } as unknown as Request['server']
  } satisfies Pick<Request, 'yar' | 'server'>
  const journey = 'tb-origin'
  const cachedState = { answered: true }
  const returnedContext = { errors: [] }
  const metadata = {
    id: 'metadata-123',
    live: { updatedAt: new Date('2024-10-15T10:00:00Z') },
    draft: { updatedAt: new Date('2024-10-10T10:00:00Z') },
    versions: [{ versionNumber: 9 }],
    notificationEmail: 'test@example.com'
  }
  const definition = { pages: [] }
  let formModel: { getFormContext: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    formModel = { getFormContext: jest.fn().mockResolvedValue(returnedContext) }
    FormModel.mockImplementation(() => formModel)
    mockFormsService.getFormMetadata.mockResolvedValue(metadata)
    mockFormsService.getFormDefinition.mockResolvedValue(definition)
    mockGetCacheService.mockReturnValue(mockCacheService)
    mockCacheService.getState.mockResolvedValue(cachedState)
  })

  test('builds a form context using cached state and configured services', async () => {
    const context = await getFormContext(request, journey)

    expect(mockFormsService.getFormMetadata).toHaveBeenCalledWith(journey)
    expect(mockFormsService.getFormDefinition).toHaveBeenCalledWith(
      metadata.id,
      'live'
    )

    expect(FormModel).toHaveBeenCalledWith(
      definition,
      {
        basePath: journey,
        versionNumber: metadata.versions[0].versionNumber,
        ordnanceSurveyApiKey: undefined,
        formId: metadata.id
      },
      mockServices,
      undefined
    )

    expect(mockGetCacheService).toHaveBeenCalledWith(request.server)
    expect(mockCacheService.getState).toHaveBeenCalledTimes(1)

    const summaryRequest = mockCacheService.getState.mock.calls[0][0]

    expect(summaryRequest).toEqual(
      expect.objectContaining({
        yar: request.yar,
        method: 'get',
        params: { path: 'summary', slug: journey },
        query: {},
        path: `/${journey}/summary`,
        server: request.server
      })
    )
    expect(summaryRequest.url.toString()).toBe(
      'http://form-context.local/tb-origin/summary'
    )

    expect(formModel.getFormContext).toHaveBeenCalledWith(
      summaryRequest,
      { $$__referenceNumber: 'TODO', ...cachedState },
      []
    )

    expect(context).toBe(returnedContext)
  })

  test('passes through the requested journey state when resolving the form model', async () => {
    await getFormContext(request, journey, FormStatus.Draft)

    expect(mockFormsService.getFormDefinition).toHaveBeenCalledWith(
      metadata.id,
      FormStatus.Draft
    )
  })
})

describe('getFormModel helper', () => {
  const slug = 'tb-origin'
  const state = FormStatus.Draft
  class CustomController extends PageController {}
  const controllers = { CustomController }
  const metadata = {
    id: 'form-meta-123',
    versions: [{ versionNumber: 17 }]
  }
  const definition = { pages: [{ path: '/start' }] }
  let formsService: FormsService
  let services: Services
  let formModelInstance: { id: string }

  beforeEach(() => {
    jest.clearAllMocks()
    formModelInstance = { id: 'form-model-instance' }
    FormModel.mockImplementation(() => formModelInstance)
    services = {
      formsService: {
        getFormMetadata: jest.fn().mockResolvedValue(metadata),
        getFormMetadataById: jest.fn(),
        getFormDefinition: jest.fn().mockResolvedValue(definition)
      },
      formSubmissionService: {
        persistFiles: jest.fn(),
        submit: jest.fn()
      },
      outputService: {
        submit: jest.fn()
      }
    }
    formsService = services.formsService
  })

  test('constructs a FormModel using fetched metadata and definition', async () => {
    const model = await getFormModel(slug, state, { services, controllers })

    expect(formsService.getFormMetadata).toHaveBeenCalledWith(slug)
    expect(formsService.getFormDefinition).toHaveBeenCalledWith(
      metadata.id,
      state
    )
    expect(FormModel).toHaveBeenCalledWith(
      definition,
      {
        basePath: slug,
        versionNumber: metadata.versions[0].versionNumber,
        ordnanceSurveyApiKey: undefined,
        formId: metadata.id
      },
      services,
      controllers
    )
    expect(model).toBe(formModelInstance)
  })

  test('maps preview state requests to the live form definition', async () => {
    await getFormModel(slug, 'preview', { services, controllers })

    expect(formsService.getFormDefinition).toHaveBeenCalledWith(
      metadata.id,
      'live'
    )
  })

  test('throws when no form definition is available', async () => {
    jest.mocked(formsService.getFormDefinition).mockResolvedValue(undefined)

    await expect(
      getFormModel(slug, state, { services, controllers })
    ).rejects.toThrow(
      `No definition found for form metadata ${metadata.id} (${slug}) ${state}`
    )

    expect(FormModel).not.toHaveBeenCalled()
  })
})

describe('getFirstJourneyPage helper', () => {
  const buildPage = (path: string, keys: string[] = []) =>
    ({ path, keys }) as unknown as PageControllerClass

  test('returns undefined when no context or relevant target path is available', () => {
    expect(getFirstJourneyPage()).toBeUndefined()
    expect(getFirstJourneyPage({ relevantPages: [] })).toBeUndefined()
  })

  test('returns the page matching the last recorded path', () => {
    const startPage = buildPage('/start')
    const nextPage = buildPage('/animals')

    const context: Pick<FormContext, 'relevantPages'> = {
      relevantPages: [startPage, nextPage]
    }

    expect(getFirstJourneyPage(context)).toBe(nextPage)
  })

  test('steps back from terminal pages to the previous relevant page', () => {
    const startPage = buildPage('/start')
    const exitPage = Object.assign(new MockTerminalPageController(), {
      path: '/stop'
    }) as unknown as PageControllerClass

    const context: Pick<FormContext, 'relevantPages'> = {
      relevantPages: [startPage, exitPage]
    }

    expect(getFirstJourneyPage(context)).toBe(startPage)
  })

  test('returns the terminal page when it is the only relevant page available', () => {
    const exitPage = Object.assign(new MockTerminalPageController(), {
      path: '/stop'
    }) as unknown as PageControllerClass

    const context: Pick<FormContext, 'relevantPages'> = {
      relevantPages: [exitPage]
    }

    expect(getFirstJourneyPage(context)).toBe(exitPage)
  })
})

/**
 * @import { FormContext } from './types.js'
 */
