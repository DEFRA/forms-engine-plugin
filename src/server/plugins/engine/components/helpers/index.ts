import { type ComponentDef } from '@defra/forms-model'
import joi, { type JoiExpression, type ReferenceOptions } from 'joi'
import _lowerFirst from 'lodash/lowerFirst.js'

import { type FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'

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

export function lowerFirst(component: FormComponent) {
  const label = component.label

  if (component.options?.preserveLabelCasing) {
    return label
  }

  return _lowerFirst(label)
}

/**
 * Applies lowerFirst but preserves capitalisation of proper nouns
 * like "National Grid", "Ordnance Survey" and "OS".
 */
export function lowerFirstPreserveProperNouns(text: string): string {
  const result = _lowerFirst(text)
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
