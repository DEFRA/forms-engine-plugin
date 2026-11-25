// Declaration above is needed for: https://github.com/hapijs/joi/issues/3064

import { lowerFirstPreserveProperNouns } from '~/src/server/plugins/engine/components/helpers/index.js'
import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'

export const opts = /** @type {ReferenceOptions} */ ({
  functions: {
    lowerFirst: lowerFirstPreserveProperNouns
  }
})

/**
 * Module-level English message templates — built via the same factory used per-form.
 * Components that have not yet been migrated to use model.validationMessages still
 * import messageTemplate directly and get the English version.
 * @type {ValidationMessages}
 */
export const messageTemplate = buildValidationMessages((key, options) =>
  t(key, 'en-GB', options)
)

/** @type {LanguageMessagesExt} */
export const messages = {
  'string.base': messageTemplate.required,
  'string.min': messageTemplate.min,
  'string.empty': messageTemplate.required,
  'string.max': messageTemplate.max,
  'string.email': messageTemplate.format,
  'string.unicode': messageTemplate.unicode,
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

  'array.min': messageTemplate.arrayMin,
  'array.max': messageTemplate.arrayMax,
  'array.length': messageTemplate.arrayLength,

  'object.invalidjson': messageTemplate.format,

  'phoneNumber.invalid': messageTemplate.format
}

/** @type {LanguageMessages} */
export const messagesPre = /** @type {LanguageMessages} */ (
  /** @type {unknown} */ (messages)
)

/**
 * @param {(key: string, options?: Record<string, unknown>) => string} t
 * @returns {LanguageMessages}
 */
export function buildLanguageMessages(t) {
  const vm = buildValidationMessages(t)
  return /** @type {LanguageMessages} */ (
    /** @type {unknown} */ ({
      'string.base': vm.required,
      'string.min': vm.min,
      'string.empty': vm.required,
      'string.max': vm.max,
      'string.email': vm.format,
      'string.pattern.base': vm.pattern,
      'string.maxWords': vm.maxWords,
      'string.unicode': vm.unicode,
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
      'array.min': vm.arrayMin,
      'array.max': vm.arrayMax,
      'array.length': vm.arrayLength,
      'object.invalidjson': vm.format,
      'phoneNumber.invalid': vm.format
    })
  )
}

/** @type {ValidationOptions} */
export const validationOptions = {
  abortEarly: false,
  messages: messagesPre,
  errors: {
    wrap: {
      array: false,
      label: false
    }
  }
}

/**
 * @import { LanguageMessages, LanguageMessagesExt, ReferenceOptions, ValidationOptions } from 'joi'
 * @import { ValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
 */
