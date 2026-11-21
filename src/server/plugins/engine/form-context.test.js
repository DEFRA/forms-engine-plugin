import {
  getFirstJourneyPage,
  getFormContext,
  getFormModel,
  resolveFormModel
} from '~/src/server/plugins/engine/form-context.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { FormStatus } from '~/src/server/routes/types.js'

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
  .../** @type {object} */ (
    jest.requireActual('~/src/server/plugins/engine/helpers.js')
  ),
  /**
   * @param {...unknown} args
   * @returns {unknown}
   */
  getCacheService: (...args) => mockGetCacheService(...args),
  /**
   * @param {...unknown} args
   * @returns {unknown}
   */
  checkEmailAddressForLiveFormSubmission: (...args) =>
    mockCheckEmailAddressForLiveFormSubmission(...args)
}))

/** @type {{ formsService: { getFormMetadata: jest.Mock, getFormDefinition: jest.Mock } }} */
const mockServices = jest.requireMock(
  '~/src/server/plugins/engine/services/index.js'
)
const mockFormsService = mockServices.formsService

/** @type {{ FormModel: jest.Mock }} */
const { FormModel } = jest.requireMock(
  '~/src/server/plugins/engine/models/index.js'
)

/** @type {{ TerminalPageController: new () => { path: string } }} */
const { TerminalPageController: MockTerminalPageController } = jest.requireMock(
  '~/src/server/plugins/engine/pageControllers/index.js'
)

describe('getFormContext helper', () => {
  const request = /** @satisfies {Pick<Request, 'yar' | 'server'>} */ ({
    yar: /** @type {Request['yar']} */ (
      /** @type {unknown} */ ({ set: jest.fn(), get: jest.fn() })
    ),
    server: /** @type {Request['server']} */ (
      /** @type {unknown} */ ({
        app: {},
        realm: { modifiers: { route: { prefix: '' } } },
        // eslint-disable-next-line no-useless-computed-key
        plugins: { ['forms-engine-plugin']: { getLanguage: () => 'en-GB' } }
      })
    )
  })
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
  /** @type {{ getFormContext: jest.Mock, createTranslator: jest.Mock }} */
  let formModel

  beforeEach(() => {
    jest.clearAllMocks()
    formModel = {
      getFormContext: jest.fn().mockResolvedValue(returnedContext),
      createTranslator: jest.fn().mockReturnValue({})
    }
    FormModel.mockImplementation(
      /**
       * @param {unknown} _definition
       * @param {FormModelOptions} modelOptions
       */
      (_definition, modelOptions) =>
        Object.assign(formModel, { basePath: modelOptions.basePath })
    )
    mockFormsService.getFormMetadata.mockResolvedValue(metadata)
    mockFormsService.getFormDefinition.mockResolvedValue(definition)
    mockGetCacheService.mockReturnValue(mockCacheService)
    mockCacheService.getState.mockResolvedValue(cachedState)
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

    /** @type {{ params: Record<string, string>, path: string, url: URL }} */
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

    const translator = formModel.createTranslator.mock.results[0].value

    expect(formModel.createTranslator).toHaveBeenCalledWith('en-GB')
    expect(formModel.getFormContext).toHaveBeenCalledWith(
      summaryRequest,
      expect.objectContaining({ $$__referenceNumber: 'CACHED-REF' }),
      errors,
      translator
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
    id: 'form-meta-123'
  }
  const definition = {
    pages: [{ path: '/start' }],
    metadata: {
      $$__formVersion: {
        versionNumber: 17,
        createdAt: new Date('2024-10-15T10:00:00Z')
      }
    }
  }
  /** @type {FormsService} */
  let formsService
  /** @type {Services} */
  let services
  /** @type {{ id: string }} */
  let formModelInstance

  beforeEach(() => {
    jest.clearAllMocks()
    formModelInstance = { id: 'form-model-instance' }
    FormModel.mockImplementation(() => formModelInstance)
    services = {
      formsService: {
        getFormMetadata: jest.fn().mockResolvedValue(metadata),
        getFormMetadataById: jest.fn(),
        getFormDefinition: jest.fn().mockResolvedValue(definition),
        getFormSecret: jest.fn()
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
  const definition = {
    pages: [],
    metadata: {
      $$__formVersion: {
        versionNumber: 9,
        createdAt: new Date('2024-10-15T10:00:00Z')
      }
    }
  }
  const metadata = {
    id: 'metadata-123',
    live: { updatedAt: new Date('2024-10-15T10:00:00Z') },
    notificationEmail: 'enrique.chase@defra.gov.uk'
  }
  /** @type {Request['server']} */
  let server
  /** @type {{ id: string }} */
  let formModelInstance

  beforeEach(() => {
    jest.clearAllMocks()
    server = /** @type {Request['server']} */ (
      /** @type {unknown} */ ({
        app: {},
        realm: { modifiers: { route: { prefix: '/forms/' } } }
      })
    )
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
    const metadataWithoutEmail = { ...metadata, notificationEmail: undefined }
    const metadataWithUpdatedDate = {
      ...metadataWithoutEmail,
      live: { updatedAt: new Date('2024-12-01T09:00:00Z') }
    }

    FormModel.mockImplementationOnce(
      () => formModelInstance
    ).mockImplementationOnce(() => refreshedModel)
    mockFormsService.getFormMetadata
      .mockResolvedValueOnce(metadataWithoutEmail)
      .mockResolvedValueOnce(metadataWithUpdatedDate)

    const model = await resolveFormModel(server, slug, 'preview', {
      ordnanceSurveyApiKey: 'os-api-key'
    })
    const rebuilt = await resolveFormModel(server, slug, 'preview')

    expect(model).toBe(formModelInstance)
    expect(rebuilt).toBe(refreshedModel)
    expect(FormModel).toHaveBeenCalledTimes(2)
    expect(mockFormsService.getFormDefinition).toHaveBeenCalledTimes(2)
    expect(mockCheckEmailAddressForLiveFormSubmission).toHaveBeenCalledWith(
      undefined,
      true
    )
    expect(FormModel).toHaveBeenNthCalledWith(
      1,
      definition,
      expect.objectContaining({
        basePath: 'forms/preview/live/tb-origin',
        ordnanceSurveyApiKey: 'os-api-key',
        formId: metadataWithoutEmail.id
      }),
      mockServices,
      undefined
    )
    expect(FormModel).toHaveBeenNthCalledWith(
      2,
      definition,
      expect.objectContaining({
        basePath: 'forms/preview/live/tb-origin',
        ordnanceSurveyApiKey: undefined,
        formId: metadataWithUpdatedDate.id
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

  test('throws when no form definition is available for the requested state', async () => {
    mockFormsService.getFormDefinition.mockResolvedValue(undefined)

    await expect(
      resolveFormModel(server, slug, FormStatus.Live)
    ).rejects.toThrow(
      `No definition found for form metadata ${metadata.id} (${slug}) ${FormStatus.Live}`
    )

    expect(FormModel).not.toHaveBeenCalled()
    expect(mockCheckEmailAddressForLiveFormSubmission).not.toHaveBeenCalled()
  })
})

describe('getFirstJourneyPage helper', () => {
  /**
   * @param {string} path
   * @param {string[]} [keys]
   */
  const buildPage = (path, keys = []) =>
    /** @type {PageControllerClass} */ (/** @type {unknown} */ ({ path, keys }))

  test('returns undefined when no context or relevant target path is available', () => {
    expect(getFirstJourneyPage()).toBeUndefined()
    expect(getFirstJourneyPage({ relevantPages: [] })).toBeUndefined()
  })

  test('returns the page matching the last recorded path', () => {
    const startPage = buildPage('/start')
    const nextPage = buildPage('/animals')

    /** @type {Pick<FormContext, 'relevantPages'>} */
    const context = {
      relevantPages: [startPage, nextPage]
    }

    expect(getFirstJourneyPage(context)).toBe(nextPage)
  })

  test('steps back from terminal pages to the previous relevant page', () => {
    const startPage = buildPage('/start')
    const exitPage = /** @type {PageControllerClass} */ (
      /** @type {unknown} */ (
        Object.assign(new MockTerminalPageController(), {
          path: '/stop'
        })
      )
    )

    /** @type {Pick<FormContext, 'relevantPages'>} */
    const context = {
      relevantPages: [startPage, exitPage]
    }

    expect(getFirstJourneyPage(context)).toBe(startPage)
  })

  test('returns the terminal page when it is the only relevant page available', () => {
    const exitPage = /** @type {PageControllerClass} */ (
      /** @type {unknown} */ (
        Object.assign(new MockTerminalPageController(), {
          path: '/stop'
        })
      )
    )

    /** @type {Pick<FormContext, 'relevantPages'>} */
    const context = {
      relevantPages: [exitPage]
    }

    expect(getFirstJourneyPage(context)).toBe(exitPage)
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { FormModelOptions } from '~/src/server/plugins/engine/form-context.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { FormsService, Services } from '~/src/server/types.js'
 */
