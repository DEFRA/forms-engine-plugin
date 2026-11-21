/**
 * The result of evaluating a condition, keeping a failed evaluation distinct
 * from one that legitimately returned `false`.
 * @see {@link ExecutableCondition.evaluate}
 * @typedef {{
 *   outcome: ConditionEvaluationOutcome
 *   error?: string
 * }} ConditionEvaluation
 */

/**
 * @typedef {object} ExecutableConditionFields
 * @property {Expression} expr - Parsed expression for the condition's {@link ConditionWrapper.value},
 *   evaluated against a context built from the submission state
 * @property {(evaluationState: FormState) => boolean} fn - Evaluates the condition, used for page routing and component visibility
 *   A failed evaluation is reported as `false`
 * @property {(evaluationState: FormState) => ConditionEvaluation} evaluate - As `fn`, but reports whether evaluation failed rather than defaulting a
 *   failure to `false`. Used to record condition outcomes on submission.
 */

/**
 * A form condition paired with the parsed expression and callbacks needed to
 * run it against a form submission state
 * Created by `FormModel.makeCondition`
 * @typedef {ConditionWrapper & ExecutableConditionFields} ExecutableCondition
 */

/**
 * Used to render a row on a Summary List (check your answers)
 * @typedef {object} DetailItemBase
 * @property {string} name - Name of the component defined in the JSON
 *   See {@link FormComponentsDef.name}
 * @property {string} label - Field label, used for change link visually hidden text
 *   See {@link FormComponentsDef.title}
 * @property {string} href - Field change link
 * @property {FormState} state - Form submission state (or repeat state for sub items)
 * @property {FormSubmissionError} [error] - Field submission state error, used to flag unanswered questions
 *   Shown as 'Complete all unanswered questions before submitting the form'
 */

/**
 * @typedef {object} DetailItemFieldFields
 * @property {Exclude<PageControllerClass, RepeatPageController>} page - Field page controller instance
 * @property {string} title - Check answers summary list key
 *   For example, 'Date of birth'
 * @property {string} value - Check answers summary list value, formatted by {@link getAnswer}
 *   For example, date fields formatted as '25 December 2022'
 * @property {Field} field - Field component instance
 */

/**
 * @typedef {DetailItemBase & DetailItemFieldFields} DetailItemField
 */

/**
 * @typedef {object} DetailItemRepeatFields
 * @property {RepeatPageController} page - Repeat page controller instance
 * @property {string} title - Check answers summary list key
 *   For example, 'Pizza' or 'Pizza added'
 * @property {string} value - Check answers summary list value
 *   For example, 'You added 2 Pizzas'
 * @property {DetailItemField[][]} subItems - Repeater field detail items
 */

/**
 * @typedef {DetailItemBase & DetailItemRepeatFields} DetailItemRepeat
 */

/**
 * @typedef {DetailItemField | DetailItemRepeat} DetailItem
 */

/**
 * Used to render a row on a Summary List (check your answers)
 * @typedef {{
 *   name?: Section['name']
 *   title?: Section['title']
 *   items: DetailItem[]
 * }} Detail
 */

/**
 * @import { ConditionEvaluationOutcome, ConditionWrapper, FormComponentsDef, Section } from '@defra/forms-model'
 * @import { Expression } from 'expr-eval-fork'
 * @import { getAnswer, Field } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { FormState, FormSubmissionError } from '~/src/server/plugins/engine/types.js'
 */
