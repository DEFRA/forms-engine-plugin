import {
  ComponentType,
  ConditionEvaluationOutcome,
  ConditionsModel,
  ControllerPath,
  ControllerType,
  SchemaVersion,
  convertConditionWrapperFromV2,
  formDefinitionSchema,
  formDefinitionV2Schema,
  generateConditionAlias,
  getErrorMessage,
  hasComponents,
  hasComponentsEvenIfNoNext,
  hasRepeater,
  isConditionWrapperV2,
  yesNoListId,
  yesNoListName
} from '@defra/forms-model'
import { add, format } from 'date-fns'
import { Parser } from 'expr-eval-fork'
import joi from 'joi'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { EN_GB } from '~/src/server/constants.js'
import {} from '~/src/server/plugins/engine/components/YesNoField.js'
import { hasListFormField } from '~/src/server/plugins/engine/components/helpers/components.js'
import { todayAsDateOnly } from '~/src/server/plugins/engine/date-helper.js'
import {
  ConditionBuildError,
  SchemaValidationError
} from '~/src/server/plugins/engine/errors.js'
import {
  findPage,
  getError,
  getPage
} from '~/src/server/plugins/engine/helpers.js'
import { loadFormTranslations } from '~/src/server/plugins/engine/i18n/createFormTranslator.js'
import { createTranslator } from '~/src/server/plugins/engine/i18n/createTranslator.js'
import { extractBaseTranslations } from '~/src/server/plugins/engine/i18n/extractBaseTranslations.js'
import { createFormI18nInstance } from '~/src/server/plugins/engine/i18n/index.js'
import {
  getAvailableLanguages,
  resolveFormLanguage
} from '~/src/server/plugins/engine/i18n/languages.js'
import { createPage } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { DEFAULT_REFERENCE_NUMBER } from '~/src/server/plugins/engine/referenceNumbers.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import { FormAction } from '~/src/server/routes/types.js'
import { merge } from '~/src/server/services/cacheService.js'

export class FormModel {
  /**
   * The runtime engine that should be used
   * @type {Engine | undefined}
   */
  engine

  /** @type {SchemaVersion} */
  schemaVersion

  /**
   * the entire form JSON as an object
   * @type {FormDefinition}
   */
  def

  /** @type {FormDefinition['lists']} */
  lists
  /** @type {FormDefinition['sections']} */
  sections = []
  /** @type {string} */
  name
  /** @type {string} */
  formId
  /** @type {FormDefinition} */
  values
  /** @type {string} */
  basePath
  /** @type {string | undefined} */
  ordnanceSurveyApiKey
  /** @type {Partial<Record<string, ExecutableCondition>>} */
  conditions
  /** @type {PageControllerClass[]} */
  pages
  /** @type {Services} */
  services
  /**
   * @private
   * @readonly
   * @type {i18n}
   */
  i18nInstance

  /** @type {Record<string, typeof PageController> | undefined} */
  controllers
  /** @type {Map<string, Page>} */
  pageDefMap

  /** @type {Map<string, List>} */
  listDefMap
  /** @type {Map<string, List>} */
  listDefIdMap

  /** @type {Map<string, ComponentDef>} */
  componentDefMap
  /** @type {Map<string, ComponentDef>} */
  componentDefIdMap

  /** @type {Map<string, PageControllerClass>} */
  pageMap
  /** @type {Map<string, Component>} */
  componentMap

  /**
   * @param {FormModel['def']} def
   * @param {object} options
   * @param {string} options.basePath
   * @param {string} [options.ordnanceSurveyApiKey]
   * @param {string} [options.formId]
   * @param {Services} [services]
   * @param {Record<string, typeof PageController>} [controllers]
   */
  constructor(def, options, services = defaultServices, controllers) {
    let schema = formDefinitionV2Schema

    if (!def.schema || def.schema === SchemaVersion.V1) {
      logger.warn(
        `[DEPRECATION NOTICE] Form "${def.name}" constructed with legacy V1 schema. See https://defra.github.io/forms-engine-plugin/schemas/form-definition-schema.html.`
      )
      schema = formDefinitionSchema
    }

    const result = schema.validate(def, { abortEarly: false })

    if (result.error) {
      throw new SchemaValidationError(result.error)
    }

    // Make a clone of the shallow copy returned
    // by joi so as not to change the source data.
    def = structuredClone(result.value)

    const baseTranslations = extractBaseTranslations(def)
    this.i18nInstance = createFormI18nInstance(baseTranslations)
    loadFormTranslations(def, this.i18nInstance)

    // Add default lists. The Welsh text for Yes/No is added by item id in
    // `loadFormTranslations`, so that the definition keeps the English text.
    def.lists.push({
      id: def.schema === SchemaVersion.V1 ? yesNoListName : yesNoListId,
      name: '__yesNo',
      title: 'Yes/No',
      type: 'boolean',
      items: [
        {
          id: '02900d42-83d1-4c72-a719-c4e8228952fa',
          text: 'Yes',
          value: true
        },
        {
          id: 'f39000eb-c51b-4019-8f82-bbda0423f04d',
          text: 'No',
          value: false
        }
      ]
    })

    this.engine = def.engine
    this.schemaVersion = def.schema ?? SchemaVersion.V1
    this.def = def
    this.lists = def.lists
    this.sections = def.sections
    this.name = def.name ?? ''
    this.formId = options.formId ?? ''
    this.values = result.value
    this.basePath = options.basePath
    this.ordnanceSurveyApiKey = options.ordnanceSurveyApiKey
    this.conditions = {}
    this.services = services
    this.controllers = controllers

    // Assert that there is only one payment question (if any)
    if (this.moreThanOnePaymentQuestion()) {
      throw new Error(
        'Invalid form definition: Only one payment question is allowed per form'
      )
    }

    this.pageDefMap = new Map(def.pages.map((page) => [page.path, page]))
    this.listDefMap = new Map(def.lists.map((list) => [list.name, list]))
    this.listDefIdMap = new Map(
      def.lists
        .filter((list) => list.id) // Skip lists without an ID
        .map((list) => [/** @type {string} */ (list.id), list])
    )
    this.componentDefMap = new Map(
      def.pages
        .filter(hasComponents)
        .flatMap((page) =>
          page.components.map((component) => [component.name, component])
        )
    )
    this.componentDefIdMap = new Map(
      def.pages.filter(hasComponents).flatMap((page) =>
        page.components
          .filter((component) => component.id) // Skip components without an ID
          .map((component) => {
            return [/** @type {string} */ (component.id), component]
          })
      )
    )

    def.conditions.forEach((conditionDef) => {
      const condition = this.makeCondition(
        isConditionWrapperV2(conditionDef)
          ? convertConditionWrapperFromV2(conditionDef, this)
          : conditionDef
      )
      this.conditions[condition.name] = condition
    })

    this.pages = def.pages.map((pageDef) => createPage(this, pageDef))

    if (
      !def.pages.some(
        ({ controller }) =>
          // Check for user-provided status page (optional)
          controller === ControllerType.Status
      )
    ) {
      this.pages.push(
        createPage(this, {
          title: 'pages.confirmation.formSubmitted',
          path: ControllerPath.Status,
          controller: ControllerType.Status
        })
      )
    }

    this.pageMap = new Map(this.pages.map((page) => [page.path, page]))
    this.componentMap = new Map(
      this.pages.flatMap((page) =>
        page.collection.components.map((component) => [
          component.name,
          component
        ])
      )
    )
  }

  /**
   * Returns a scoped translator pair for the given language.
   * @param {string} [language]
   * @returns {Translator}
   */
  createTranslator(language = EN_GB) {
    return createTranslator(
      this.i18nInstance,
      resolveFormLanguage(this.def, language)
    )
  }

  /**
   * build the entire model schema from individual pages/sections and filter out answers
   * for pages which are no longer accessible due to an answer that has been changed
   * @param {PageControllerClass[]} relevantPages
   */
  makeFilteredSchema(relevantPages) {
    // Build the entire model schema
    // from the individual pages/sections
    let schema = /** @type {ObjectSchema<FormSubmissionState>} */ (
      joi.object()
    ).required()

    relevantPages.forEach((page) => {
      schema = schema.concat(page.collection.stateSchema)
    })

    return schema
  }

  /**
   * Instantiates a Condition based on {@link ConditionWrapper}
   * @param {ConditionWrapper} condition
   * @returns {ExecutableCondition}
   */
  makeCondition(condition) {
    const parser = new Parser({
      operators: {
        logical: true
      }
    })

    Object.assign(parser.functions, {
      /**
       * @param {number} timePeriod
       * @param {DateUnits} timeUnit
       */
      dateForComparison(timePeriod, timeUnit) {
        // The time element must be stripped (hence using startOfDay() which has no time element),
        // then formatted as YYYY-MM-DD otherwise we can hit time element and BST issues giving the
        // wrong date to compare against.
        // Do not use .toISOString() to format the date as that introduces BST errors.
        return format(
          add(todayAsDateOnly(), { [timeUnit]: timePeriod }),
          'yyyy-MM-dd'
        )
      }
    })

    const { name, displayName, value } = condition

    let expr
    try {
      expr = this.toConditionExpression(value, parser)
    } catch (cause) {
      throw new ConditionBuildError(displayName, { cause })
    }

    /**
     * @param {FormState} evaluationState
     * @returns {ConditionEvaluation}
     */
    const evaluate = (evaluationState) => {
      const ctx = this.toConditionContext(evaluationState, this.conditions)

      try {
        return {
          outcome: /** @type {boolean} */ (expr.evaluate(ctx))
            ? ConditionEvaluationOutcome.True
            : ConditionEvaluationOutcome.False
        }
      } catch (err) {
        return {
          outcome: ConditionEvaluationOutcome.Error,
          error: getErrorMessage(err)
        }
      }
    }

    // A failed evaluation continues to route as `false`. `evaluate` exists so
    // that the two can be told apart when recording outcomes for submission.
    const fn = (/** @type {FormState} */ evaluationState) =>
      evaluate(evaluationState).outcome === ConditionEvaluationOutcome.True

    return {
      name,
      displayName,
      value,
      expr,
      fn,
      evaluate
    }
  }

  /**
   * @param {FormState} evaluationState
   * @param {Partial<Record<string, ExecutableCondition>>} conditions
   */
  toConditionContext(evaluationState, conditions) {
    const context = { ...evaluationState }

    for (const conditionId in conditions) {
      const propertyName =
        this.schemaVersion === SchemaVersion.V2
          ? generateConditionAlias(conditionId)
          : conditionId

      Object.defineProperty(context, propertyName, {
        get() {
          return conditions[conditionId]?.fn(evaluationState)
        }
      })
    }

    return /** @type {Extract<Value, Record<string, Value>>} */ (context)
  }

  /**
   * @param {ConditionsModelData} value
   * @param {Parser} parser
   */
  toConditionExpression(value, parser) {
    const conditions = ConditionsModel.from(value)
    return parser.parse(conditions.toExpression())
  }

  /**
   * @param {string} nameOrId
   * @returns {List | undefined}
   */
  getList(nameOrId) {
    return this.schemaVersion === SchemaVersion.V1
      ? this.lists.find((list) => list.name === nameOrId)
      : this.lists.find((list) => list.id === nameOrId)
  }

  /**
   * @param {string} nameOrId
   * @returns {Section | undefined}
   */
  getSection(nameOrId) {
    return this.schemaVersion === SchemaVersion.V1
      ? this.sections.find((section) => section.name === nameOrId)
      : this.sections.find((section) => section.id === nameOrId)
  }

  /**
   * Form context for the current page
   * @param {FormContextRequest} request
   * @param {FormSubmissionState} state
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormContext}
   */
  getFormContext(request, state, errors, translator) {
    const { query } = request

    const page = getPage(this, request)

    // Determine form paths
    const currentPath = page.path
    const startPath = page.getStartPath()

    // Preview URL direct access is allowed
    const isForceAccess = 'force' in query

    /** @type {FormContext} */
    let context = {
      evaluationState: {},
      relevantState: {},
      relevantPages: [],
      payload: page.getFormDataFromState(request, state),
      state,
      paths: [],
      errors,
      isForceAccess,
      data: {},
      pageDefMap: this.pageDefMap,
      listDefMap: this.listDefMap,
      componentDefMap: this.componentDefMap,
      pageMap: this.pageMap,
      componentMap: this.componentMap,
      referenceNumber: getReferenceNumber(state),
      languages: getAvailableLanguages(this.def),
      translator
    }

    // Validate current page
    context = validateFormPayload(request, page, context, translator)

    // Find start page
    let nextPage = findPage(this, startPath)

    this.initialiseContext(context)

    // Walk form pages from start
    while (nextPage) {
      // Add page to context
      context.relevantPages.push(nextPage)

      this.assignEvaluationState(context, nextPage)

      this.assignRelevantState(context, nextPage)

      // Stop at current page
      if (
        this.pageStateIsInvalid(context, nextPage, translator) ||
        nextPage.path === currentPath
      ) {
        break
      }

      // Apply conditions to determine next page
      nextPage = findPage(this, nextPage.getNextPath(context))
    }

    // Validate form state
    context = validateFormState(request, page, context)

    // Add paths for navigation
    this.assignPaths(context)

    return context
  }

  /**
   * @private
   * @param {FormContext} context
   */
  initialiseContext(context) {
    // Initialise `evaluationState` for all keys using empty state.
    // This is because the current condition evaluation library (eval-expr)
    // will throw if an expression uses a key that is undefined.
    const emptyState = Object.freeze({})

    for (const page of this.pages) {
      const { collection, pageDef } = page

      if (!hasRepeater(pageDef)) {
        Object.assign(
          context.evaluationState,
          collection.getContextValueFromState(emptyState)
        )
      }
    }
  }

  /**
   * @private
   * @param {FormContext} context
   * @param {PageControllerClass} page
   */
  assignEvaluationState(context, page) {
    const { collection, pageDef } = page
    // Skip evaluation state for repeater pages

    if (!hasRepeater(pageDef)) {
      Object.assign(
        context.evaluationState,
        collection.getContextValueFromState(context.state)
      )
    }
  }

  /**
   * @private
   * @param {FormContext} context
   * @param {PageControllerClass} page
   */
  assignRelevantState(context, page) {
    // Copy relevant state by expected keys
    for (const key of page.keys) {
      if (typeof context.state[key] !== 'undefined') {
        context.relevantState[key] = context.state[key]
      }
    }
  }

  /**
   * @private
   * @param {FormContext} context
   * @param {PageControllerClass} page
   * @param {Translator} [translator]
   */
  pageStateIsInvalid(context, page, translator) {
    // Get any list-bound fields on the page
    const listFields = page.collection.fields.filter(hasListFormField)

    // For each list field that is bound to a list that contains any conditional items,
    // we need to check any answers are still valid. Do this by evaluating the conditions
    // and ensuring any current answers are all included in the set of valid answers
    for (const field of listFields) {
      const list = field.list

      // Filter out YesNo as they can't be conditional
      if (list !== undefined && field.type !== ComponentType.YesNoField) {
        const hasOptionalItems =
          list.items.filter((item) => item.condition).length > 0

        if (hasOptionalItems) {
          return this.fieldStateIsInvalid(context, field, list, translator)
        }
      }
    }
  }

  /**
   * @private
   * @param {FormContext} context
   * @param {ListFormComponent} field
   * @param {List} list
   * @param {Translator} [translator]
   */
  fieldStateIsInvalid(context, field, list, translator) {
    const { evaluationState, state } = context

    const validValues = list.items
      .filter((item) =>
        item.condition
          ? this.conditions[item.condition]?.fn(evaluationState)
          : true
      )
      .map((item) => item.value)

    // Get the field state
    const fieldState = field.getFormValueFromState(state)

    if (fieldState !== undefined) {
      let isInvalid = false
      const isArray = Array.isArray(fieldState)

      // Check if any saved state value(s) are still valid
      // and return true if any are invalid
      if (isArray) {
        isInvalid = !fieldState.every((item) => validValues.includes(item))
      } else {
        isInvalid = !validValues.includes(fieldState)
      }

      if (isInvalid) {
        context.errors ??= []

        const text = (translator ?? this.createTranslator('en-GB')).t(
          'errors.optionsMismatch'
        )

        context.errors.push({
          text,
          name: field.name,
          href: `#${field.name}`,
          path: [`#${field.name}`]
        })
      }

      return isInvalid
    }
  }

  /**
   * @private
   * @param {FormContext} context
   */
  assignPaths(context) {
    for (const { keys, path } of context.relevantPages) {
      context.paths.push(path)

      // Stop at page with errors
      if (
        context.errors?.some(({ name, path }) => {
          return keys.includes(name) || keys.some((key) => path.includes(key))
        })
      ) {
        break
      }
    }
  }

  /**
   * @param {string} componentId
   * @returns {ComponentDef | undefined}
   */
  getComponentById(componentId) {
    return this.componentDefIdMap.get(componentId)
  }

  /**
   * @param {string} listId
   * @returns {List | undefined}
   */
  getListById(listId) {
    return this.listDefIdMap.get(listId)
  }

  /**
   * Returns a condition by its ID. O(n) lookup time.
   * @param {string} conditionId
   * @returns {ConditionWrapperV2 | undefined}
   */
  getConditionById(conditionId) {
    return this.def.conditions
      .filter(isConditionWrapperV2)
      .find((condition) => condition.id === conditionId)
  }

  /**
   * Checks that only one payment field exists (if any payments fields exist)
   */
  moreThanOnePaymentQuestion() {
    const numOfPaymentFields = this.def.pages
      .flatMap((page) =>
        hasComponentsEvenIfNoNext(page) ? page.components : []
      )
      .filter((comp) => comp.type === ComponentType.PaymentField).length
    return numOfPaymentFields > 1
  }

  /**
   * Returns the reference number from state, falling back to the default
   * reference number when previewing with `?force`
   * @param {FormState} state
   * @param {FormRequestPayload} request
   * @returns {string}
   */
  getReference(state, request) {
    const forceReferenceNumber =
      'force' in request.query ? DEFAULT_REFERENCE_NUMBER : undefined
    return /** @type {string} */ (
      state.$$__referenceNumber ?? forceReferenceNumber
    )
  }
}

/**
 * Validate current page only
 * @param {FormContextRequest} request
 * @param {PageControllerClass} page
 * @param {FormContext} context
 * @param {Translator} [translator]
 * @returns {FormContext}
 */
function validateFormPayload(request, page, context, translator) {
  const { collection } = page
  const { payload, state } = context

  const { action } = page.getFormParams(request)

  // Skip validation GET requests or other actions
  if (
    !request.payload ||
    (action &&
      action !== FormAction.Validate &&
      !action.startsWith(FormAction.External))
  ) {
    return context
  }

  // For checkbox fields missing in the payload (i.e. unchecked),
  // explicitly set their value to undefined so that any previously
  // stored value is cleared and required field validation is enforced.
  const update = { ...request.payload }
  collection.fields.forEach((field) => {
    if (
      field.type === ComponentType.CheckboxesField &&
      !(field.name in update)
    ) {
      update[field.name] = undefined
    }
  })

  const { value, errors } = collection.validate(
    { ...payload, ...update },
    translator
  )

  // Add sanitised payload (ready to save)
  const formState = page.getStateFromValidForm(request, state, value)

  return {
    ...context,
    payload: merge(payload, value),
    state: merge(state, formState),
    errors
  }
}

/**
 * Validate entire form state
 * @param {FormContextRequest} request
 * @param {PageControllerClass} page
 * @param {FormContext} context
 * @returns {FormContext}
 */
function validateFormState(request, page, context) {
  const { errors = [], relevantPages, relevantState } = context

  // Exclude current page
  const previousPages = relevantPages.filter(
    (relevantPage) => relevantPage !== page
  )

  // Validate relevant state
  const { error } = page.model
    .makeFilteredSchema(previousPages)
    .validate(relevantState, { ...opts, stripUnknown: true })

  // Add relevant state errors
  if (error) {
    const errorsState = error.details.map((item) => getError(item, EN_GB))
    return { ...context, errors: errors.concat(errorsState) }
  }

  return context
}

/**
 * @param {FormSubmissionState} state
 * @returns {string}
 */
function getReferenceNumber(state) {
  if (
    !state.$$__referenceNumber ||
    typeof state.$$__referenceNumber !== 'string'
  ) {
    throw Error('Reference number not found in form state')
  }

  return state.$$__referenceNumber
}

/**
 * @import { ComponentDef, ConditionWrapper, ConditionWrapperV2, ConditionsModelData, DateUnits, Engine, FormDefinition, List, Page, Section } from '@defra/forms-model'
 * @import { Value } from 'expr-eval-fork'
 * @import { i18n } from 'i18next'
 * @import { ObjectSchema } from 'joi'
 * @import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
 * @import { Component } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ConditionEvaluation, ExecutableCondition } from '~/src/server/plugins/engine/models/types.js'
 * @import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { FormContext, FormContextRequest, FormState, FormSubmissionError, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequestPayload } from '~/src/server/routes/types.js'
 * @import { Services } from '~/src/server/types.js'
 */
