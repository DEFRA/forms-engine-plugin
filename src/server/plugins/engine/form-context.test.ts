import { type Request } from '@hapi/hapi'

import { type Field } from '~/src/server/plugins/engine/components/helpers/components.js'
import {
  getFirstJourneyPage,
  getFormContext,
  getFormModel,
  mapFormContextToAnswers
} from '~/src/server/plugins/engine/form-context.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { type Services } from '~/src/server/types.js'

const mockGetCacheService = jest.fn()
const mockCacheService = { getState: jest.fn() }
const mockEvaluateTemplate = jest.fn((template) => template)
const mockGetPageHref = jest.fn((page, pathOrQuery, queryOnly = {}) => {
  const path =
    typeof pathOrQuery === 'string'
      ? pathOrQuery
      : typeof page.path === 'string'
        ? page.path
        : ''

  const target =
    typeof page.getHref === 'function' ? page.getHref(path) : path
  const query =
    typeof pathOrQuery === 'object' && !Array.isArray(pathOrQuery)
      ? pathOrQuery
      : queryOnly

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === 'string') {
      params.set(key, value)
    }
  }

  const search = params.toString()
  return search ? `${target}?${search}` : target
})
const mockGetAnswer = jest.fn()
const mockCheckEmailAddressForLiveFormSubmission = jest.fn()

jest.mock(
  '~/src/server/plugins/engine/components/helpers/components.js',
  () => ({
    __esModule: true,
    getAnswer: (...args: unknown[]) => mockGetAnswer(...args)
  })
)

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
  evaluateTemplate: (...args: unknown[]) => mockEvaluateTemplate(...args),
  getPageHref: (...args: unknown[]) => mockGetPageHref(...args),
  checkEmailAddressForLiveFormSubmission: (
    ...args: unknown[]
  ) => mockCheckEmailAddressForLiveFormSubmission(...args)
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
    mockEvaluateTemplate.mockImplementation((template) => template)
    mockGetAnswer.mockReturnValue('formatted answer')
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
    await getFormContext(request, journey, 'draft')

    expect(mockFormsService.getFormDefinition).toHaveBeenCalledWith(
      metadata.id,
      'draft'
    )
  })
})

describe('mapFormContextToAnswers helper', () => {
  type MockField = Pick<Field, 'name' | 'title' | 'type' | 'getFormValueFromState'>
  const buildPage = (
    fields: MockField[],
    path = '/page-path',
    withHref = true
  ) => {
    const page = {
      path,
      collection: { fields },
      ...(withHref && {
        getHref: jest.fn((target: string) => `/journey${target}`)
      })
    } satisfies Partial<PageControllerClass> & {
      path: string
      collection: { fields: MockField[] }
    }

    return page as unknown as PageControllerClass
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockEvaluateTemplate.mockImplementation((template) => `rendered:${template}`)
    mockGetAnswer.mockReturnValue('display text')
  })

  test('returns an empty array when no context is provided', () => {
    expect(mapFormContextToAnswers()).toEqual([])
  })

  test('omits unanswered components', () => {
    const emptyField = {
      name: 'empty',
      title: 'Empty question',
      type: 'TextField',
      getFormValueFromState: jest.fn().mockReturnValue('   ')
    }
    const answeredField = {
      name: 'filled',
      title: 'Filled question',
      type: 'TextField',
      getFormValueFromState: jest.fn().mockReturnValue('value')
    }

    const context = {
      relevantPages: [buildPage([emptyField, answeredField])],
      state: { some: 'state' }
    }

    expect(mapFormContextToAnswers(context)).toEqual([
      {
        slug: '/journey/page-path',
        changeHref: '/journey/page-path?returnUrl=%2Fjourney%2Fsummary',
        question: 'rendered:Filled question',
        questionKey: 'filled',
        answer: {
          type: 'text',
          value: 'value',
          displayText: 'display text'
        }
      }
    ])
  })

  test('maps known component types to the expected answer shape', () => {
    const addressValue = {
      uprn: null,
      addressLine1: '10 Downing Street',
      addressTown: 'London',
      postcode: 'SW1A 2AA'
    }

    const field = {
      name: 'addressField',
      title: 'Address question',
      type: 'UkAddressField',
      getFormValueFromState: jest.fn().mockReturnValue(addressValue)
    }

    const context = {
      relevantPages: [buildPage([field], '/address')],
      state: { addressField__addressLine1: '10 Downing Street' }
    }

    mockGetAnswer.mockReturnValue('10 Downing Street<br />London<br />SW1A 2AA')

    expect(mapFormContextToAnswers(context)).toEqual([
      {
        slug: '/journey/address',
        changeHref: '/journey/address?returnUrl=%2Fjourney%2Fsummary',
        question: 'rendered:Address question',
        questionKey: 'addressField',
        answer: {
          type: 'address',
          value: addressValue,
          displayText: '10 Downing Street<br />London<br />SW1A 2AA'
        }
      }
    ])
  })

  test('falls back to the raw template when evaluation fails', () => {
    mockEvaluateTemplate.mockImplementation(() => {
      throw new Error('boom')
    })

    const field = {
      name: 'failingQuestion',
      title: 'Question with template',
      type: 'TextField',
      getFormValueFromState: jest.fn().mockReturnValue('Some value')
    }

    const context = {
      relevantPages: [buildPage([field])],
      state: {}
    }

    expect(mapFormContextToAnswers(context)).toEqual([
      {
        slug: '/journey/page-path',
        changeHref: '/journey/page-path?returnUrl=%2Fjourney%2Fsummary',
        question: 'Question with template',
        questionKey: 'failingQuestion',
        answer: {
          type: 'text',
          value: 'Some value',
          displayText: 'display text'
        }
      }
    ])
  })

  test('maps checkbox answers and preserves array values', () => {
    const checkboxValue = ['option-a', 'option-b']

    const field = {
      name: 'reasons',
      title: 'Why are you moving animals?',
      type: 'CheckboxesField',
      getFormValueFromState: jest.fn().mockReturnValue(checkboxValue)
    }

    mockGetAnswer.mockReturnValue('Reason A<br />Reason B')

    const context = {
      relevantPages: [buildPage([field], '/checkbox')],
      state: { reasons: checkboxValue }
    }

    expect(mapFormContextToAnswers(context)).toEqual([
      {
        slug: '/journey/checkbox',
        changeHref: '/journey/checkbox?returnUrl=%2Fjourney%2Fsummary',
        question: 'rendered:Why are you moving animals?',
        questionKey: 'reasons',
        answer: {
          type: 'checkbox',
          value: checkboxValue,
          displayText: 'Reason A<br />Reason B'
        }
      }
    ])
  })

  test('skips object answers when every nested value is empty', () => {
    const emptyAddress = {
      addressLine1: '   ',
      addressLine2: '',
      addressTown: '\n',
      addressCounty: undefined,
      addressPostcode: ''
    }

    const field = {
      name: 'originAddress',
      title: 'Origin address',
      type: 'UkAddressField',
      getFormValueFromState: jest.fn().mockReturnValue(emptyAddress)
    }

    const context = {
      relevantPages: [buildPage([field])],
      state: {}
    }

    expect(mapFormContextToAnswers(context)).toEqual([])
  })

  test('maps file upload answers and marks them as file type', () => {
    const files = [
      {
        filename: 'movement-plan.pdf',
        status: { form: { file: { filename: 'movement-plan.pdf' } } }
      }
    ]

    const field = {
      name: 'biosecurityPlan',
      title: 'Upload your biosecurity plan',
      type: 'FileUploadField',
      getFormValueFromState: jest.fn().mockReturnValue(files)
    }

    mockGetAnswer.mockReturnValue('movement-plan.pdf')

    const context = {
      relevantPages: [buildPage([field], '/files')],
      state: { biosecurityPlan: files }
    }

    expect(mapFormContextToAnswers(context)).toEqual([
      {
        slug: '/journey/files',
        changeHref: '/journey/files?returnUrl=%2Fjourney%2Fsummary',
        question: 'rendered:Upload your biosecurity plan',
        questionKey: 'biosecurityPlan',
        answer: {
          type: 'file',
          value: files,
          displayText: 'movement-plan.pdf'
        }
      }
    ])
  })

  test('falls back to page path when getHref is unavailable', () => {
    const field = {
      name: 'noHref',
      title: 'Some question',
      type: 'TextField',
      getFormValueFromState: jest.fn().mockReturnValue('value')
    }

    const context = {
      relevantPages: [buildPage([field], '/no-href', false)],
      state: {}
    }

    expect(mapFormContextToAnswers(context)).toEqual([
      {
        slug: '/no-href',
        changeHref: '/no-href',
        question: 'rendered:Some question',
        questionKey: 'noHref',
        answer: {
          type: 'text',
          value: 'value',
          displayText: 'display text'
        }
      }
    ])
  })

  test('allows overriding the return path used for change links', () => {
    const field = {
      name: 'customReturn',
      title: 'Some question',
      type: 'TextField',
      getFormValueFromState: jest.fn().mockReturnValue('value')
    }

    const context = {
      relevantPages: [buildPage([field], '/custom-path')],
      state: {}
    }

    expect(
      mapFormContextToAnswers(context, { returnPath: '/custom-summary' })
    ).toEqual([
      {
        slug: '/journey/custom-path',
        changeHref:
          '/journey/custom-path?returnUrl=%2Fjourney%2Fcustom-summary',
        question: 'rendered:Some question',
        questionKey: 'customReturn',
        answer: {
          type: 'text',
          value: 'value',
          displayText: 'display text'
        }
      }
    ])
  })
})

describe('getFormModel helper', () => {
  const slug = 'tb-origin'
  const state = 'draft'
  const controllers = { CustomController: Symbol('CustomController') }
  const metadata = {
    id: 'form-meta-123',
    versions: [{ versionNumber: 17 }]
  }
  const definition = { pages: [{ path: '/start' }] }
  let formsService: {
    getFormMetadata: jest.Mock
    getFormDefinition: jest.Mock
  }
  let services: Services
  let formModelInstance: { id: string }

  beforeEach(() => {
    jest.clearAllMocks()
    formModelInstance = { id: 'form-model-instance' }
    FormModel.mockImplementation(() => formModelInstance)
    formsService = {
      getFormMetadata: jest.fn().mockResolvedValue(metadata),
      getFormDefinition: jest.fn().mockResolvedValue(definition)
    }
    services = {
      formsService,
      formSubmissionService: {},
      outputService: {}
    }
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
    formsService.getFormDefinition.mockResolvedValue(undefined)

    await expect(
      getFormModel(slug, state, { services, controllers })
    ).rejects.toThrow(
      `No definition found for form metadata ${metadata.id} (${slug}) ${state}`
    )

    expect(FormModel).not.toHaveBeenCalled()
  })
})

describe('getFirstJourneyPage helper', () => {
  const buildPage = (path: string, keys: string[] = []) => ({ path, keys })

  test('returns undefined when no context or relevant target path is available', () => {
    expect(getFirstJourneyPage()).toBeUndefined()
    expect(getFirstJourneyPage({ relevantPages: [] })).toBeUndefined()
  })

  test('returns the page matching the last recorded path', () => {
    const startPage = buildPage('/start')
    const nextPage = buildPage('/animals')

    const context = {
      relevantPages: [startPage, nextPage]
    }

    expect(getFirstJourneyPage(context)).toBe(nextPage)
  })

  test('steps back from terminal pages to the previous relevant page', () => {
    const startPage = buildPage('/start')
    const exitPage = Object.assign(new MockTerminalPageController(), {
      path: '/stop'
    }) as unknown as PageControllerClass

    const context = {
      relevantPages: [startPage, exitPage]
    }

    expect(getFirstJourneyPage(context)).toBe(startPage)
  })

  test('returns the terminal page when it is the only relevant page available', () => {
    const exitPage = Object.assign(new MockTerminalPageController(), {
      path: '/stop'
    }) as unknown as PageControllerClass

    const context = {
      relevantPages: [exitPage]
    }

    expect(getFirstJourneyPage(context)).toBe(exitPage)
  })
})

/**
 * @import { FormContext } from './types.js'
 */
