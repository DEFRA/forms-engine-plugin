// Declaration above is needed for: https://github.com/hapijs/joi/issues/3064

import {
  type LanguageMessages,
  type LanguageMessagesExt,
  type ValidationOptions
} from 'joi'

import {
  buildValidationMessages,
  type ValidationMessages
} from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'

/**
 * Module-level English message templates — built via the same factory used per-form.
 * Components that have not yet been migrated to use model.validationMessages still
 * import messageTemplate directly and get the English version.
 */
export const messageTemplate: ValidationMessages = buildValidationMessages(
  (key) => t(key, 'en-GB')
)

export const messages: LanguageMessagesExt = {
  'string.base': messageTemplate.required,
  'string.min': messageTemplate.min,
  'string.empty': messageTemplate.required,
  'string.max': messageTemplate.max,
  'string.email': messageTemplate.format,
  'string.pattern.base': messageTemplate.pattern,
  'string.maxWords': messageTemplate.maxWords,

  'number.base': messageTemplate.number,
  'number.precision': messageTemplate.numberPrecision,
  'number.integer': messageTemplate.numberInteger,
  'number.unsafe': messageTemplate.format,
  'number.min': messageTemplate.numberMin,
  'number.max': messageTemplate.numberMax,

  'object.required': messageTemplate.objectRequired,
  'object.and': messageTemplate.objectMissing,

  'any.only': messageTemplate.selectRequired,
  'any.required': messageTemplate.selectRequired,
  'any.empty': messageTemplate.required,

  'date.base': messageTemplate.dateFormat,
  'date.format': messageTemplate.dateFormat,
  'date.min': messageTemplate.dateMin,
  'date.max': messageTemplate.dateMax,

  'object.invalidjson': messageTemplate.format
}

export const messagesPre: LanguageMessages =
  messages as unknown as LanguageMessages

export function buildLanguageMessages(
  t: (key: string) => string
): LanguageMessages {
  const vm = buildValidationMessages(t)
  return {
    'string.base': vm.required,
    'string.min': vm.min,
    'string.empty': vm.required,
    'string.max': vm.max,
    'string.email': vm.format,
    'string.pattern.base': vm.pattern,
    'string.maxWords': vm.maxWords,
    'number.base': vm.number,
    'number.precision': vm.numberPrecision,
    'number.integer': vm.numberInteger,
    'number.unsafe': vm.format,
    'number.min': vm.numberMin,
    'number.max': vm.numberMax,
    'object.required': vm.objectRequired,
    'object.and': vm.objectMissing,
    'any.only': vm.selectRequired,
    'any.required': vm.selectRequired,
    'any.empty': vm.required,
    'date.base': vm.dateFormat,
    'date.format': vm.dateFormat,
    'date.min': vm.dateMin,
    'date.max': vm.dateMax,
    'object.invalidjson': vm.format
  } as unknown as LanguageMessages
}

export const validationOptions: ValidationOptions = {
  abortEarly: false,
  messages: messagesPre,
  errors: {
    wrap: {
      array: false,
      label: false
    }
  }
}
