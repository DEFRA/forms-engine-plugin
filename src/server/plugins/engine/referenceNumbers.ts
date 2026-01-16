import { randomBytes } from 'node:crypto'

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers
} from 'obscenity'

/**
 * To prevent confusion to users reading the reference number, ambiguous letters and numbers are removed.
 * @param str - input string
 */
function convertToDecAlpha(str: string) {
  const validChars = 'ABCDEFHJKLMNPRSTUVWXYZ23456789'
  const strLen = validChars.length
  const outArray = [] as string[]

  Array.from(str).forEach((_ch, idx) => {
    const pos = (str.charCodeAt(idx) / 256) * strLen
    outArray.push(validChars.charAt(pos))
  })

  return outArray.join('')
}

/**
 * Generates a reference number in the format of `XXX-XXX-XXX`, or `PREFIX-XXX-XXX` if a prefix is provided.
 * Provides no guarantee on uniqueness.
 * To prevent confusion to users reading the reference number, ambiguous letters and numbers are removed
 * (see https://gunkies.org/wiki/DEC_alphabet )
 */
export function generateUniqueReference(prefix?: string) {
  const segmentLength = 3
  const segmentCount = prefix ? 2 : 3
  prefix = prefix ? `${prefix}-` : ''

  const profanityMatcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers
  })

  let referenceNumber

  do {
    const segments = Array.from({ length: segmentCount }, () =>
      convertToDecAlpha(randomBytes(segmentLength).toString('binary')).slice(
        0,
        segmentLength
      )
    )

    referenceNumber = `${prefix}${segments.join('-')}`.toUpperCase()
  } while (profanityMatcher.hasMatch(referenceNumber.replaceAll('-', '')))

  return referenceNumber
}
