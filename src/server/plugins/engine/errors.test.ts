import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '~/src/server/plugins/engine/errors.js'

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
