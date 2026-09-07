import { type ComponentDef } from '@defra/forms-model'
import joi, {
  type JoiExpression,
  type LanguageMessages,
  type ReferenceOptions
} from 'joi'
import lowerFirst from 'lodash/lowerFirst.js'

import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'

/**
 * Prevent Markdown formatting
 * @see {@link https://pandoc.org/chunkedhtml-demo/8.11-backslash-escapes.html}
 */
export function escapeMarkdown(answer: string) {
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

export const addClassOptionIfNone = (
  options: Extract<ComponentDef, { options: { classes?: string } }>['options'],
  className: string
) => {
  options.classes ??= className
}

/**
 * Applies lowerFirst but preserves capitalisation of proper nouns
 * like "National Grid", "Ordnance Survey" and "OS".
 */
export function lowerFirstPreserveProperNouns(text: string): string {
  const result = lowerFirst(text)
  return result
    .replace(/\bnational [Gg]rid\b/g, 'National Grid')
    .replace(/\bordnance [Ss]urvey\b/g, 'Ordnance Survey')
    .replace(/\b[oO][sS]\b/g, 'OS')
}

/**
 * Configuration for Joi expressions that use lowerFirst function
 */
export const lowerFirstExpressionOptions = {
  functions: {
    lowerFirst: lowerFirstPreserveProperNouns
  }
} as ReferenceOptions

/**
 * Creates a Joi expression with lowerFirst function support
 * Used for error messages in location field components
 */
export const createLowerFirstExpression = (template: string): JoiExpression =>
  joi.expression(template, lowerFirstExpressionOptions) as JoiExpression

/**
 * Joi's own LanguageMessages type only allows string values, but
 * buildValidationMessages() returns JoiExpression for templated messages,
 * which Joi accepts at runtime. This type covers both.
 */
type TranslatedValidationMessages = Record<string, string | JoiExpression>

/**
 * Keep the form author's custom validation message for any key they set,
 * so translated defaults only fill in the keys the author left blank.
 */
export function withCustomValidationOverrides(
  defaults: TranslatedValidationMessages,
  customValidationMessages?: LanguageMessages
): LanguageMessages {
  return Object.fromEntries(
    Object.entries(defaults).filter(
      ([key]) => !(key in (customValidationMessages ?? {}))
    )
  ) as LanguageMessages
}

/**
 * Translate a component label, in precedence order of errorDescription, then shortDesciption, then title
 * @param {ComponentDef} component
 * @param {Translator} translator
 */
export function getTranslatedLabel(
  component: ComponentDef,
  translator: Translator
) {
  const { tComponent } = translator
  const translatedLabel =
    tComponent(component, 'errorDescription') ||
    tComponent(component, 'shortDescription') ||
    tComponent(component, 'title')
  return translatedLabel
}
