import { type ValidationError } from 'joi'

/**
 * Base class for errors caused by an invalid form definition — whether it
 * fails schema validation or passes the schema but cannot be used by the
 * engine. Never thrown directly — throw a subclass. Consumers (e.g.
 * forms-runner error pages) detect the family with
 * `instanceof InvalidFormDefinitionError`.
 */
export class InvalidFormDefinitionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InvalidFormDefinitionError'
  }
}

/**
 * Thrown when a condition in the definition cannot be compiled into an
 * evaluatable expression (e.g. it references the wrong component or list).
 */
export class ConditionBuildError extends InvalidFormDefinitionError {
  public readonly conditionName: string

  constructor(conditionName: string, options?: ErrorOptions) {
    super(`Failed to build condition '${conditionName}'`, options)
    this.name = 'ConditionBuildError'
    this.conditionName = conditionName
  }
}

/**
 * Thrown when a page names a controller that is neither built in nor
 * registered by the host application.
 */
export class UnknownPageControllerError extends InvalidFormDefinitionError {
  public readonly controllerName: string

  constructor(controllerName: string) {
    super(`Page controller ${controllerName} does not exist`)
    this.name = 'UnknownPageControllerError'
    this.controllerName = controllerName
  }
}

/**
 * Thrown when a component declares a type with no registered implementation.
 */
export class UnknownComponentTypeError extends InvalidFormDefinitionError {
  public readonly componentType: string

  constructor(componentType: string) {
    super(`Component type ${componentType} does not exist`)
    this.name = 'UnknownComponentTypeError'
    this.componentType = componentType
  }
}

/**
 * Thrown when a form definition fails Joi schema validation. The raw
 * ValidationError is preserved as `cause` so consumers can reach the
 * per-field details; the message carries Joi's own summary so log lines
 * remain diagnostic for consumers that only read `error.message`.
 */
export class SchemaValidationError extends InvalidFormDefinitionError {
  // Error types `cause` as unknown; this constructor only accepts a Joi
  // ValidationError, so narrow the declaration for consumers (type-only).
  declare cause: ValidationError

  constructor(cause: ValidationError) {
    super(`Invalid form definition: ${cause.message}`, { cause })
    this.name = 'SchemaValidationError'
  }
}
