import { type ComponentDef } from '@defra/forms-model'

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
