import { randomBytes } from 'node:crypto'

/**
 * Generates a reference number in the format of `XXX-XXX-XXX`, or `PREFIX-XXX-XXX` if a prefix is provided.
 * Provides no guarantee on uniqueness.
 */
export function generateUniqueReference(prefix?: string) {
  const segmentLength = 3
  const segmentCount = prefix ? 2 : 3
  prefix = prefix ? `${prefix}-` : ''

  const segments = Array.from(
    { length: segmentCount },
    () => randomBytes(segmentLength).toString('hex').slice(0, segmentLength) // 0-9a-f, might be good enough?
  )

  return `${prefix}${segments.join('-')}`.toUpperCase()
}
