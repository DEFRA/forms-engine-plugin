import {
  buildBrokenConditionDefinition,
  buildSchemaInvalidDefinition,
  buildUnknownControllerDefinition
} from '~/src/server/plugins/engine/__stubs__/definitions.js'
import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  SchemaValidationError,
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

  it('UnknownPageControllerError carries the controller name', () => {
    const err = new UnknownPageControllerError('NoSuchPageController')

    expect(err).toBeInstanceOf(InvalidFormDefinitionError)
    expect(err.name).toBe('UnknownPageControllerError')
    expect(err.controllerName).toBe('NoSuchPageController')
    expect(err.message).toBe(
      'Page controller NoSuchPageController does not exist'
    )
  })

  it('UnknownComponentTypeError carries the component type', () => {
    const err = new UnknownComponentTypeError('NopeField')

    expect(err).toBeInstanceOf(InvalidFormDefinitionError)
    expect(err.name).toBe('UnknownComponentTypeError')
    expect(err.componentType).toBe('NopeField')
    expect(err.message).toBe('Component type NopeField does not exist')
  })
})

describe('typed errors thrown from real failure sites', () => {
  it('FormModel throws ConditionBuildError for an uncompilable condition', () => {
    const build = () =>
      new FormModel(buildBrokenConditionDefinition(), { basePath: 'test' })

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
      new FormModel(buildUnknownControllerDefinition(), { basePath: 'test' })

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

describe('SchemaValidationError', () => {
  it('is thrown by FormModel for a schema-invalid definition, wrapping the raw Joi error', () => {
    const build = () =>
      new FormModel(buildSchemaInvalidDefinition(), { basePath: 'test' })

    let thrown: unknown
    try {
      build()
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(SchemaValidationError)
    expect(thrown).toBeInstanceOf(InvalidFormDefinitionError)

    const schemaError = thrown as SchemaValidationError
    expect(schemaError.name).toBe('SchemaValidationError')
    expect(schemaError.message).toContain('Invalid form definition:')

    const cause = schemaError.cause as {
      isJoi?: boolean
      details?: unknown[]
    }
    expect(cause.isJoi).toBe(true)
    expect(Array.isArray(cause.details)).toBe(true)
  })
})
