import joi, { type JoiExpression, type ReferenceOptions } from 'joi'

import { lowerFirstPreserveProperNouns } from '~/src/server/plugins/engine/components/helpers/index.js'

const opts = {
  functions: {
    lowerFirst: lowerFirstPreserveProperNouns
  }
} as ReferenceOptions

/**
 * Builds a set of translated Joi message templates for a given language.
 * Called once per FormModel at construction time.
 *
 * Strings containing {{lowerFirst(#label)}} must be wrapped in joi.expression()
 * because Joi cannot resolve custom functions from a plain string.
 * Plain strings with only built-in tokens ({{#label}}, {{#limit}}) work without wrapping.
 */
export function buildValidationMessages(t: (key: string) => string) {
  return {
    // Expressions — contain lowerFirst custom function
    required: joi.expression(t('validation.required'), opts) as JoiExpression,
    selectRequired: joi.expression(
      t('validation.selectRequired'),
      opts
    ) as JoiExpression,
    pattern: joi.expression(t('validation.pattern'), opts) as JoiExpression,
    format: joi.expression(t('validation.format'), opts) as JoiExpression,
    declarationRequired: joi.expression(
      t('validation.declarationRequired'),
      opts
    ) as JoiExpression,
    objectRequired: joi.expression(
      t('validation.objectRequired'),
      opts
    ) as JoiExpression,
    objectMissing: joi.expression(
      t('validation.objectMissing'),
      opts
    ) as JoiExpression,

    // Plain Joi template strings — no lowerFirst
    selectYesNoRequired: t('validation.selectYesNoRequired'),
    max: t('validation.max'),
    min: t('validation.min'),
    minMax: t('validation.minMax'),
    number: t('validation.number'),
    numberPrecision: t('validation.numberPrecision'),
    numberInteger: t('validation.numberInteger'),
    numberMin: t('validation.numberMin'),
    numberMax: t('validation.numberMax'),
    maxWords: t('validation.maxWords'),
    dateFormat: t('validation.dateFormat'),
    dateMin: t('validation.dateMin'),
    dateMax: t('validation.dateMax')
  }
}

export type ValidationMessages = ReturnType<typeof buildValidationMessages>
