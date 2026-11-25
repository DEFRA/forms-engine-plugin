/**
 * Base class for errors caused by an invalid form definition — whether it
 * fails schema validation or passes the schema but cannot be used by the
 * engine. Never thrown directly — throw a subclass. Consumers (e.g.
 * forms-runner error pages) detect the family with
 * `instanceof InvalidFormDefinitionError`.
 *
 * When subclassing, remember that the message and the messages of any
 * `cause` chain are shown to form authors on preview error pages. Only
 * describe the problem with the form itself — never include sensitive
 * details such as file paths, configuration values or secrets.
 */
export class InvalidFormDefinitionError extends Error {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options)
    this.name = 'InvalidFormDefinitionError'
  }
}

/**
 * Thrown when a condition in the definition cannot be compiled into an
 * evaluatable expression (e.g. it references the wrong component or list).
 */
export class ConditionBuildError extends InvalidFormDefinitionError {
  /**
   * @readonly
   * @type {string}
   */
  conditionName

  /**
   * @param {string} conditionName
   * @param {ErrorOptions} [options]
   */
  constructor(conditionName, options) {
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
  /**
   * @readonly
   * @type {string}
   */
  controllerName

  /**
   * @param {string} controllerName
   */
  constructor(controllerName) {
    super(`Page controller ${controllerName} does not exist`)
    this.name = 'UnknownPageControllerError'
    this.controllerName = controllerName
  }
}

/**
 * Thrown when a component declares a type with no registered implementation.
 */
export class UnknownComponentTypeError extends InvalidFormDefinitionError {
  /**
   * @readonly
   * @type {string}
   */
  componentType

  /**
   * @param {string} componentType
   */
  constructor(componentType) {
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
  // ValidationError, so narrow the declaration for consumers. As a class
  // field, `cause` keeps the value the Error constructor set and is
  // enumerable.
  /** @type {Joi.ValidationError} */
  // @ts-expect-error TS2729: the base constructor has already set it
  cause = this.cause

  /**
   * @param {Joi.ValidationError} cause
   */
  constructor(cause) {
    super(`Invalid form definition: ${cause.message}`, { cause })
    this.name = 'SchemaValidationError'
  }
}

/**
 * The default import rather than the named `ValidationError`, so that `tsc`
 * keeps the import in `errors.d.ts`. TypeScript 7 no longer needs this.
 * @import Joi from 'joi'
 */
