import { randomBytes } from 'node:crypto'

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers
} from 'obscenity'

/**
 * To prevent confusion to users reading the reference number, ambiguous letters and numbers are removed.
 * @param strCodes - array of binary input values
 */
export function convertToDecAlpha(strCodes: number[]) {
  const validChars = 'ABCDEFHJKLMNPRSTUVWXYZ23456789'
  const strLen = validChars.length
  const outArray = [] as string[]

  strCodes.forEach((code) => {
    const pos = (code / 256) * strLen
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
      convertToDecAlpha([...randomBytes(segmentLength)]).slice(
        0,
        segmentLength * 2
      )
    )

    referenceNumber = `${prefix}${segments.join('-')}`.toUpperCase()
  } while (profanityMatcher.hasMatch(referenceNumber.replaceAll('-', '')))

  return referenceNumber
}
