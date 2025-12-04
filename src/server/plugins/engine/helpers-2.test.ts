import {
  ComponentType,
  ControllerType,
  type FormDefinition,
  type PageQuestion
} from '@defra/forms-model'

import { setPageTitles } from '~/src/server/plugins/engine/helpers.js'

const mockInfo = jest.fn()

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

jest.mock('~/src/server/common/helpers/logging/logger.ts', () => ({
  createLogger: () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  })
}))

describe('setPageTitles', () => {
  const definition: FormDefinition = {
    name: 'Test Form',
    startPage: '/page1',
    pages: [
      {
        path: '/page1',
        title: '',
        next: [],
        components: [
          {
            type: ComponentType.TextField,
            name: 'textfield1',
            title: 'What is your name?',
            options: {},
            schema: {}
          },
          {
            type: ComponentType.TextField,
            name: 'textfield2',
            title: 'What is your favourite food?',
            options: {},
            schema: {}
          }
        ]
      } satisfies PageQuestion
    ],
    lists: [],
    sections: [],
    conditions: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mock('~/src/server/common/helpers/logging/logger.ts', () => ({
      createLogger: jest.fn().mockReturnValue(mockLogger)
    }))
  })
  it('should set title if missing', () => {
    const def = structuredClone(definition)
    setPageTitles(def)
    expect(def.pages[0].title).toBe('What is your name?')
    expect(mockLogger.info).not.toHaveBeenCalled()
  })

  it('should keep title if supplied', () => {
    const def = structuredClone(definition)
    def.pages[0].title = 'Page 1 title'
    setPageTitles(def)
    expect(def.pages[0].title).toBe('Page 1 title')
    expect(mockLogger.info).not.toHaveBeenCalled()
  })

  it('should log if missing title and no components and not Summary page', () => {
    const def = structuredClone(definition)
    if ('components' in def.pages[0]) {
      def.pages[0].components = []
    }
    setPageTitles(def)
    expect(def.pages[0].title).toBe('')
    expect(mockLogger.info).toHaveBeenCalled()
  })

  it('should not log missing title if Summary page', () => {
    const def = structuredClone(definition)
    def.pages[0].controller = ControllerType.Summary
    if ('components' in def.pages[0]) {
      def.pages[0].components = []
    }
    setPageTitles(def)
    expect(def.pages[0].title).toBe('')
    expect(mockInfo).not.toHaveBeenCalled()
  })
})
