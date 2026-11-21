import {
  buildBrokenConditionDefinition,
  buildSchemaInvalidDefinition,
  buildUnknownComponentDefinition,
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

    /** @type {unknown} */
    let thrown
    try {
      build()
    } catch (err) {
      thrown = err
    }

    const conditionErr = /** @type {ConditionBuildError} */ (thrown)
    expect(conditionErr.conditionName).toBe('Existing user')
    expect(conditionErr.cause).toBeInstanceOf(Error)
    expect(/** @type {Error} */ (conditionErr.cause).message).toContain(
      'parse error'
    )
  })

  it('FormModel throws UnknownPageControllerError for an unregistered controller', () => {
    const build = () =>
      new FormModel(buildUnknownControllerDefinition(), { basePath: 'test' })

    expect(build).toThrow(UnknownPageControllerError)

    /** @type {unknown} */
    let thrown
    try {
      build()
    } catch (err) {
      thrown = err
    }

    expect(
      /** @type {UnknownPageControllerError} */ (thrown).controllerName
    ).toBe('NoSuchPageController')
  })
})

describe('typed errors thrown from real failure sites (components)', () => {
  it('FormModel throws UnknownComponentTypeError for an unregistered component type', () => {
    const build = () =>
      new FormModel(buildUnknownComponentDefinition(), { basePath: 'test' })

    expect(build).toThrow(UnknownComponentTypeError)

    /** @type {unknown} */
    let thrown
    try {
      build()
    } catch (err) {
      thrown = err
    }

    expect(
      /** @type {UnknownComponentTypeError} */ (thrown).componentType
    ).toBe('MyUnknownField')
  })
})

describe('SchemaValidationError', () => {
  it('is thrown by FormModel for a schema-invalid definition, wrapping the raw Joi error', () => {
    const build = () =>
      new FormModel(buildSchemaInvalidDefinition(), { basePath: 'test' })

    /** @type {unknown} */
    let thrown
    try {
      build()
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(SchemaValidationError)
    expect(thrown).toBeInstanceOf(InvalidFormDefinitionError)

    const schemaError = /** @type {SchemaValidationError} */ (thrown)
    expect(schemaError.name).toBe('SchemaValidationError')
    expect(schemaError.message).toContain('Invalid form definition:')

    expect(schemaError.cause.isJoi).toBe(true)
    expect(Array.isArray(schemaError.cause.details)).toBe(true)
  })
})
