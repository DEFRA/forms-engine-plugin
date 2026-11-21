import joi from 'joi'

import { lowerFirstPreserveProperNouns } from '~/src/server/plugins/engine/components/helpers/index.js'

const opts = /** @type {ReferenceOptions} */ ({
  functions: {
    lowerFirst: lowerFirstPreserveProperNouns
  }
})

/**
 * Builds a set of translated Joi message templates for a given language.
 * Called once per FormModel at construction time.
 *
 * Strings containing {{lowerFirst(#label)}} must be wrapped in joi.expression()
 * because Joi cannot resolve custom functions from a plain string.
 * Plain strings with only built-in tokens ({{#label}}, {{#limit}}) work without wrapping.
 * @param {(key: string, options?: Record<string, unknown>) => string} t
 */
export function buildValidationMessages(t) {
  return {
    // Expressions — contain lowerFirst custom function
    required: /** @type {JoiExpression} */ (
      joi.expression(t('validation.required'), opts)
    ),
    selectRequired: /** @type {JoiExpression} */ (
      joi.expression(t('validation.selectRequired'), opts)
    ),
    pattern: /** @type {JoiExpression} */ (
      joi.expression(t('validation.pattern'), opts)
    ),
    format: /** @type {JoiExpression} */ (
      joi.expression(t('validation.format'), opts)
    ),
    declarationRequired: /** @type {JoiExpression} */ (
      joi.expression(
        t('components.declarationField.validation.declarationRequired'),
        opts
      )
    ),
    objectRequired: /** @type {JoiExpression} */ (
      joi.expression(t('validation.objectRequired'), opts)
    ),
    objectMissing: /** @type {JoiExpression} */ (
      joi.expression(t('validation.objectMissing'), opts)
    ),

    // Plain Joi template strings — no lowerFirst
    selectYesNoRequired: t(
      'components.yesNoField.validation.selectYesNoRequired'
    ),
    max: t('validation.max'),
    min: t('validation.min'),
    minMax: t('validation.minMax'),
    number: t('validation.number'),
    numberPrecision: t('validation.numberPrecision'),
    numberInteger: t('validation.numberInteger'),
    numberMin: t('validation.numberMin'),
    numberMax: t('validation.numberMax'),
    maxWords: t('validation.maxWords'),
    dateFormat: t('components.dateField.validation.dateFormat'),
    dateMin: t('components.dateField.validation.dateMin'),
    dateMax: t('components.dateField.validation.dateMax'),

    unicode: t('validation.unicode'),
    // These generic templates are shared across fields with differing limits, so a
    // fixed singular count is used here — components needing accurate singular/plural
    // text (e.g. FileUploadField) build their own per-instance messages instead.
    arrayMin: t('validation.arrayMin', { count: 1 }),
    arrayMax: t('validation.arrayMax', { count: 1 }),
    arrayLength: t('validation.arrayLength', { count: 1 }),
    featuresMin: t('validation.featuresMin', { count: 1 }),
    featuresMax: t('validation.featuresMax', { count: 1 }),
    featuresLength: t('validation.featuresLength', { count: 1 }),
    filesMin: t('validation.filesMin', { count: 1 }),
    filesMax: t('validation.filesMax', { count: 1 }),
    filesLength: t('validation.filesLength', { count: 1 })
  }
}

/**
 * @typedef {ReturnType<typeof buildValidationMessages>} ValidationMessages
 */

/**
 * @import { JoiExpression, ReferenceOptions } from 'joi'
 */
