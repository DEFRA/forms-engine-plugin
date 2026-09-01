import {
  type ConditionEvaluationOutcome,
  type ConditionWrapper,
  type FormComponentsDef,
  type Section
} from '@defra/forms-model'
import { type Expression } from 'expr-eval-fork'

import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { type RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import {
  type FormState,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

/**
 * The result of evaluating a condition, keeping a failed evaluation distinct
 * from one that legitimately returned `false`.
 * @see {@link ExecutableCondition.evaluate}
 */
export interface ConditionEvaluation {
  outcome: ConditionEvaluationOutcome
  error?: string
}

/**
 * A form condition paired with the parsed expression and callbacks needed to
 * run it against a form submission state
 * Created by `FormModel.makeCondition`
 */
export type ExecutableCondition = ConditionWrapper & {
  /**
   * Parsed expression for the condition's {@link ConditionWrapper.value},
   * evaluated against a context built from the submission state
   */
  expr: Expression

  /**
   * Evaluates the condition, used for page routing and component visibility
   * A failed evaluation is reported as `false`
   */
  fn: (evaluationState: FormState) => boolean

  /**
   * As `fn`, but reports whether evaluation failed rather than defaulting a
   * failure to `false`. Used to record condition outcomes on submission.
   */
  evaluate: (evaluationState: FormState) => ConditionEvaluation
}

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface DetailItemBase {
  /**
   * Name of the component defined in the JSON
   * @see {@link FormComponentsDef.name}
   */
  name: string

  /**
   * Field label, used for change link visually hidden text
   * @see {@link FormComponentsDef.title}
   */
  label: string

  /**
   * Field change link
   */
  href: string

  /**
   * Form submission state (or repeat state for sub items)
   */
  state: FormState

  /**
   * Field submission state error, used to flag unanswered questions
   * Shown as 'Complete all unanswered questions before submitting the form'
   */
  error?: FormSubmissionError
}

export interface DetailItemField extends DetailItemBase {
  /**
   * Field page controller instance
   */
  page: Exclude<PageControllerClass, RepeatPageController>

  /**
   * Check answers summary list key
   * For example, 'Date of birth'
   */
  title: string

  /**
   * Check answers summary list value, formatted by {@link getAnswer}
   * For example, date fields formatted as '25 December 2022'
   */
  value: string

  /**
   * Field component instance
   */
  field: Field
}

export interface DetailItemRepeat extends DetailItemBase {
  /**
   * Repeat page controller instance
   */
  page: RepeatPageController

  /**
   * Check answers summary list key
   * For example, 'Pizza' or 'Pizza added'
   */
  title: string

  /**
   * Check answers summary list value
   * For example, 'You added 2 Pizzas'
   */
  value: string

  /**
   * Repeater field detail items
   */
  subItems: DetailItemField[][]
}

export type DetailItem = DetailItemField | DetailItemRepeat

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface Detail {
  name?: Section['name']
  title?: Section['title']
  items: DetailItem[]
}
