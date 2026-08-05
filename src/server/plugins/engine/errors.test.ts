import { type FormDefinition } from '@defra/forms-model'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '~/src/server/plugins/engine/errors.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'

describe('InvalidFormDefinitionError hierarchy', () => {
  it('ConditionBuildError carries the condition name and cause', () => {
    const cause = new Error('parse error [1:24]: Expected EOF')
    const err = new ConditionBuildError('Existing user', { cause })

    expect(err).toBeInstanceOf(InvalidFormDefinitionError)
    expect(err.name).toBe('ConditionBuildError')
    expect(err.conditionName).toBe('Existing user')
    expect(err.message).toBe("Failed to build condition 'Existing user'")
    expect(err.cause).toBe(cause)
  })

  it('UnknownPageControllerError keeps the legacy message text', () => {
    const err = new UnknownPageControllerError('NoSuchPageController')

    expect(err).toBeInstanceOf(InvalidFormDefinitionError)
    expect(err.name).toBe('UnknownPageControllerError')
    expect(err.controllerName).toBe('NoSuchPageController')
    expect(err.message).toBe(
      'Page controller NoSuchPageController does not exist'
    )
  })

  it('UnknownComponentTypeError keeps the legacy message text', () => {
    const err = new UnknownComponentTypeError('NopeField')

    expect(err).toBeInstanceOf(InvalidFormDefinitionError)
    expect(err.name).toBe('UnknownComponentTypeError')
    expect(err.componentType).toBe('NopeField')
    expect(err.message).toBe('Component type NopeField does not exist')
  })
})

const brokenConditionDef = {
  name: 'Broken condition fixture',
  engine: 'V2',
  schema: 2,
  startPage: '/summary',
  pages: [
    {
      id: '449c053b-9201-4312-9a75-187afc6ba48b',
      path: '/licence',
      title: 'Licence',
      components: [
        {
          id: 'a7c0242f-2a31-45b2-8c71-ff2ac7f53288',
          name: 'xVrYaJ',
          type: 'YesNoField',
          title: 'Do you have a licence?',
          shortDescription: 'Licence',
          options: { required: true },
          schema: {},
          list: '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544'
        }
      ],
      next: []
    },
    {
      id: '449c053b-9201-4312-9a75-187afc6ba48c',
      path: '/summary',
      title: 'Summary',
      controller: 'SummaryPageController',
      components: [],
      next: []
    }
  ],
  lists: [
    {
      id: '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544',
      name: 'XtfRYR',
      title: 'User type list',
      type: 'string',
      items: [
        {
          id: '55fe0067-d011-4d33-886c-e1aa266637c3',
          text: 'existing user',
          value: 'existing user'
        },
        {
          id: '2277c7e5-7fef-46c6-993b-d294116d6d6b',
          text: 'new user',
          value: 'new user'
        }
      ]
    }
  ],
  sections: [],
  conditions: [
    {
      id: '3f9d3a35-6dee-4706-806c-3f776129f631',
      displayName: 'Existing user',
      items: [
        {
          id: '7d7f58ee-c860-4d24-8a13-de5cb9af53d8',
          componentId: 'a7c0242f-2a31-45b2-8c71-ff2ac7f53288',
          operator: 'is',
          type: 'ListItemRef',
          value: {
            listId: '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544',
            itemId: ['55fe0067-d011-4d33-886c-e1aa266637c3']
          }
        }
      ]
    }
  ]
} as unknown as FormDefinition

const unknownControllerDef = {
  ...structuredClone(brokenConditionDef),
  name: 'Unknown controller fixture',
  conditions: []
} as unknown as FormDefinition
// remove the bogus list and point page 1 at a controller that does not exist
const brokenPage = unknownControllerDef.pages[0] as unknown as {
  components: { list?: string }[]
  controller: string
}
delete brokenPage.components[0].list
brokenPage.controller = 'NoSuchPageController'

describe('typed errors thrown from real failure sites', () => {
  it('FormModel throws ConditionBuildError for an uncompilable condition', () => {
    const build = () => new FormModel(brokenConditionDef, { basePath: 'test' })

    expect(build).toThrow(ConditionBuildError)

    let thrown: unknown
    try {
      build()
    } catch (err) {
      thrown = err
    }

    const conditionErr = thrown as ConditionBuildError
    expect(conditionErr.conditionName).toBe('Existing user')
    expect(conditionErr.cause).toBeInstanceOf(Error)
    expect((conditionErr.cause as Error).message).toContain('parse error')
  })

  it('FormModel throws UnknownPageControllerError for an unregistered controller', () => {
    const build = () =>
      new FormModel(unknownControllerDef, { basePath: 'test' })

    expect(build).toThrow(UnknownPageControllerError)

    let thrown: unknown
    try {
      build()
    } catch (err) {
      thrown = err
    }

    expect((thrown as UnknownPageControllerError).controllerName).toBe(
      'NoSuchPageController'
    )
  })
})
