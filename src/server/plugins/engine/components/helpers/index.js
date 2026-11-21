import joi from 'joi'
import lowerFirst from 'lodash/lowerFirst.js'

/**
 * Prevent Markdown formatting
 * @see {@link https://pandoc.org/chunkedhtml-demo/8.11-backslash-escapes.html}
 * @param {string} answer
 */
export function escapeMarkdown(answer) {
  const punctuation = [
    '`',
    "'",
    '*',
    '_',
    '{',
    '}',
    '[',
    ']',
    '(',
    ')',
    '#',
    '>',
    '+',
    '-',
    '.',
    '!'
  ]

  for (const character of punctuation) {
    answer = answer.replaceAll(character, `\\${character}`)
  }

  return answer
}

/**
 * @param {Extract<ComponentDef, { options: { classes?: string } }>['options']} options
 * @param {string} className
 */
export const addClassOptionIfNone = (options, className) => {
  options.classes ??= className
}

/**
 * Applies lowerFirst but preserves capitalisation of proper nouns
 * like "National Grid", "Ordnance Survey" and "OS".
 * @param {string} text
 * @returns {string}
 */
export function lowerFirstPreserveProperNouns(text) {
  const result = lowerFirst(text)
  return result
    .replace(/\bnational [Gg]rid\b/g, 'National Grid')
    .replace(/\bordnance [Ss]urvey\b/g, 'Ordnance Survey')
    .replace(/\b[oO][sS]\b/g, 'OS')
}

/**
 * Configuration for Joi expressions that use lowerFirst function
 */
export const lowerFirstExpressionOptions = /** @type {ReferenceOptions} */ ({
  functions: {
    lowerFirst: lowerFirstPreserveProperNouns
  }
})

/**
 * Creates a Joi expression with lowerFirst function support
 * Used for error messages in location field components
 * @param {string} template
 * @returns {JoiExpression}
 */
export const createLowerFirstExpression = (template) =>
  /** @type {JoiExpression} */ (
    joi.expression(template, lowerFirstExpressionOptions)
  )

/**
 * Joi's own LanguageMessages type only allows string values, but
 * buildValidationMessages() returns JoiExpression for templated messages,
 * which Joi accepts at runtime. This type covers both.
 * @typedef {Record<string, string | JoiExpression>} TranslatedValidationMessages
 */

/**
 * Keep the form author's custom validation message for any key they set,
 * so translated defaults only fill in the keys the author left blank.
 * A single customValidationMessage covers every key in the schema.
 * @param {TranslatedValidationMessages} defaults
 * @param {string} [customValidationMessage]
 * @param {LanguageMessages} [customValidationMessages]
 * @returns {LanguageMessages}
 */
export function withCustomValidationOverrides(
  defaults,
  customValidationMessage,
  customValidationMessages
) {
  /** @type {TranslatedValidationMessages} */
  const messages = {}

  // A global override for all messages is the value for all scenarios
  if (customValidationMessage) {
    for (const key of Object.keys(defaults)) {
      messages[key] = customValidationMessage
    }

    return /** @type {LanguageMessages} */ (messages)
  }

  // A default only fills a key that the user has not configured
  const authorKeys = Object.keys(customValidationMessages ?? {})

  for (const [key, message] of Object.entries(defaults)) {
    if (!authorKeys.includes(key)) {
      messages[key] = message
    }
  }

  return /** @type {LanguageMessages} */ (messages)
}

/**
 * Translate a component label, in precedence order of errorDescription, then shortDesciption, then title
 * @param {ComponentDef} component
 * @param {Translator} translator
 */
export function getTranslatedLabel(component, translator) {
  const { tComponent } = translator
  const translatedLabel =
    tComponent(component, 'errorDescription') ||
    tComponent(component, 'shortDescription') ||
    tComponent(component, 'title')
  return translatedLabel
}

/**
 * @import { ComponentDef } from '@defra/forms-model'
 * @import { JoiExpression, LanguageMessages, ReferenceOptions } from 'joi'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 */
