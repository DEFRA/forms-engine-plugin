import { type Request } from '@hapi/hapi'

import {
  getFirstJourneyPage,
  getFormContext,
  getFormModel,
  resolveFormModel,
  type FormModelOptions
} from '~/src/server/plugins/engine/form-context.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import { type FormsService, type Services } from '~/src/server/types.js'

const mockGetCacheService = jest.fn()
const mockCacheService = { getState: jest.fn() }
const mockCheckEmailAddressForLiveFormSubmission = jest.fn()

jest.mock('./models/index.ts', () => ({
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

jest.mock('./pageControllers/index.ts', () => {
  class MockTerminalPageController {
    path = ''
  }

  return {
    __esModule: true,
    TerminalPageController: MockTerminalPageController
  }
})

jest.mock('./helpers.ts', () => ({
  __esModule: true,
  getCacheService: (...args: unknown[]) => mockGetCacheService(...args),
  checkEmailAddressForLiveFormSubmission: (...args: unknown[]) =>
    mockCheckEmailAddressForLiveFormSubmission(...args)
}))

const mockServices = jest.requireMock(
  '~/src/server/plugins/engine/services/index.js'
)
const mockFormsService = mockServices.formsService
const { FormModel } = jest.requireMock('./models/index.ts')
const { TerminalPageController: MockTerminalPageController } = jest.requireMock(
  './pageControllers/index.ts'
)

describe('getFormContext helper', () => {
  const request = {
    yar: { set: jest.fn() } as unknown as Request['yar'],
    server: {
      app: {},
      realm: { modifiers: { route: { prefix: '' } } }
    } as unknown as Request['server']
  } satisfies Pick<Request, 'yar' | 'server'>
  const slug = 'tb-origin'
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
    FormModel.mockImplementation(
      (_definition: unknown, modelOptions: FormModelOptions) =>
        Object.assign(formModel, { basePath: modelOptions.basePath })
    )
    mockFormsService.getFormMetadata.mockResolvedValue(metadata)
    mockFormsService.getFormDefinition.mockResolvedValue(definition)
    mockGetCacheService.mockReturnValue(mockCacheService)
    mockCacheService.getState.mockResolvedValue(cachedState)
  })

  test('builds a form context using cached state and configured services', async () => {
    const context = await getFormContext(request, slug)

    expect(mockFormsService.getFormMetadata).toHaveBeenCalledWith(slug)
    expect(mockFormsService.getFormDefinition).toHaveBeenCalledWith(
      metadata.id,
      'live'
    )

    expect(FormModel).toHaveBeenCalledWith(
      definition,
      {
        basePath: slug,
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
        params: { path: 'summary', slug },
        query: {},
        path: `/${slug}/summary`,
        server: request.server
      })
    )
    expect(summaryRequest.url.toString()).toBe(
      'https://form-context.local/tb-origin/summary'
    )

    expect(formModel.getFormContext).toHaveBeenCalledWith(
      summaryRequest,
      { $$__referenceNumber: 'TODO', ...cachedState },
      []
    )

    expect(context).toBe(returnedContext)
  })

  test('passes through the requested form state when resolving the form model', async () => {
    await getFormContext(request, slug, FormStatus.Draft)

    expect(mockFormsService.getFormDefinition).toHaveBeenCalledWith(
      metadata.id,
      FormStatus.Draft
    )
  })

  test('passes preview state into the summary request and uses cached reference numbers', async () => {
    const errors = [
      { href: '#field', name: 'field', path: ['field'], text: 'is required' }
    ]

    mockCacheService.getState.mockResolvedValue({
      ...cachedState,
      $$__referenceNumber: 'CACHED-REF'
    })

    const context = await getFormContext(request, slug, 'preview', {
      errors
    })

    const summaryRequest = mockCacheService.getState.mock.calls[0][0]

    expect(summaryRequest.params).toEqual({
      path: 'summary',
      slug,
      state: 'live'
    })
    expect(summaryRequest.path).toBe('/preview/live/tb-origin/summary')
    expect(summaryRequest.url.toString()).toBe(
      'https://form-context.local/preview/live/tb-origin/summary'
    )

    expect(formModel.getFormContext).toHaveBeenCalledWith(
      summaryRequest,
      expect.objectContaining({ $$__referenceNumber: 'CACHED-REF' }),
      errors
    )
    expect(context).toBe(returnedContext)
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

describe('resolveFormModel helper', () => {
  const slug = 'tb-origin'
  const definition = { pages: [], outputEmail: 'fallback@example.com' }
  const metadata = {
    id: 'metadata-123',
    live: { updatedAt: new Date('2024-10-15T10:00:00Z') },
    versions: [{ versionNumber: 9 }]
  }
  let server: Request['server']
  let formModelInstance: { id: string }

  beforeEach(() => {
    jest.clearAllMocks()
    server = {
      app: {},
      realm: { modifiers: { route: { prefix: '/forms/' } } }
    } as unknown as Request['server']
    formModelInstance = { id: 'form-model-instance' }
    FormModel.mockImplementation(() => formModelInstance)
    mockFormsService.getFormMetadata.mockResolvedValue(metadata)
    mockFormsService.getFormDefinition.mockResolvedValue(definition)
  })

  test('reuses cached models when metadata timestamps match', async () => {
    const model = await resolveFormModel(server, slug, FormStatus.Live)
    const cached = await resolveFormModel(server, slug, FormStatus.Live)

    expect(model).toBe(formModelInstance)
    expect(cached).toBe(model)
    expect(server.app.models).toBeInstanceOf(Map)
    expect(mockFormsService.getFormDefinition).toHaveBeenCalledTimes(1)
    expect(FormModel).toHaveBeenCalledTimes(1)
  })

  test('rebuilds the model when metadata changes and uses preview routing', async () => {
    const refreshedModel = { id: 'refreshed-model' }

    FormModel.mockImplementationOnce(
      () => formModelInstance
    ).mockImplementationOnce(() => refreshedModel)
    mockFormsService.getFormMetadata
      .mockResolvedValueOnce({ ...metadata, notificationEmail: undefined })
      .mockResolvedValueOnce({
        ...metadata,
        notificationEmail: undefined,
        live: { updatedAt: new Date('2024-12-01T09:00:00Z') }
      })

    const model = await resolveFormModel(server, slug, 'preview', {
      ordnanceSurveyApiKey: 'os-api-key'
    })
    const rebuilt = await resolveFormModel(server, slug, 'preview')

    expect(model).toBe(formModelInstance)
    expect(rebuilt).toBe(refreshedModel)
    expect(FormModel).toHaveBeenCalledTimes(2)
    expect(mockFormsService.getFormDefinition).toHaveBeenCalledTimes(2)
    expect(mockCheckEmailAddressForLiveFormSubmission).toHaveBeenCalledWith(
      definition.outputEmail,
      true
    )
    expect(FormModel).toHaveBeenCalledWith(
      definition,
      expect.objectContaining({
        basePath: 'forms/preview/live/tb-origin',
        versionNumber: metadata.versions[0].versionNumber,
        ordnanceSurveyApiKey: 'os-api-key',
        formId: metadata.id
      }),
      mockServices,
      undefined
    )
  })

  test('throws when requested form state does not exist on metadata', async () => {
    mockFormsService.getFormMetadata.mockResolvedValue({
      id: 'metadata-123',
      live: { updatedAt: new Date('2024-10-15T10:00:00Z') }
    })

    await expect(
      resolveFormModel(server, slug, FormStatus.Draft)
    ).rejects.toThrow("No 'draft' state for form metadata metadata-123")

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
