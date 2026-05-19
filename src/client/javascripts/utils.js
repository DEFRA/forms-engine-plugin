/**
 * Builds a text representation of a list in the form 'a, b, c, d or e'
 * @param {string[]} items
 * @param {string} separator
 * @param {string} lastSpearator
 */
export function formatDelimtedList(items, separator, lastSpearator) {
  if (items.length === 0) {
    return ''
  }

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return `${items[0]} ${lastSpearator} ${items[1]}`
  }

  const last = items.pop()
  return `${items.join(`${separator} `)} ${lastSpearator} ${last}`
}
