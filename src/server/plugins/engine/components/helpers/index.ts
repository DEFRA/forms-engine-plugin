import { type ComponentDef } from '@defra/forms-model'
import joi, { type JoiExpression, type ReferenceOptions } from 'joi'
import lowerFirst from 'lodash/lowerFirst.js'

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
 * Configuration for Joi expressions that use lowerFirst function
 */
export const lowerFirstExpressionOptions = {
  functions: {
    lowerFirst
  }
} as ReferenceOptions

/**
 * Creates a Joi expression with lowerFirst function support
 * Used for error messages in location field components
 */
export const createLowerFirstExpression = (template: string): JoiExpression =>
  joi.expression(template, lowerFirstExpressionOptions) as JoiExpression
