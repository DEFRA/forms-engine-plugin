import { FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'

/**
 * @typedef {{
 *   offline: true
 *   metadata: FormMetadata
 *   definition?: FormDefinition
 * }} OfflineBoomData
 */

/**
 * Throws when the form has been taken offline. The plugin's
 * unavailable-response extension catches the marker and renders the
 * "Sorry, this form is unavailable" view at HTTP 200.
 * @param {FormMetadata} metadata
 * @param {FormStatus} formState
 * @param {boolean} isPreview
 * @param {FormDefinition} [definition]
 * @returns {void}
 */
export function assertFormAvailable(
  metadata,
  formState,
  isPreview,
  definition
) {
  if (
    metadata.offline === true &&
    formState === FormStatus.Live &&
    !isPreview
  ) {
    /** @type {OfflineBoomData} */
    const data = { offline: true, metadata, definition }
    throw Boom.boomify(new Error(`Form ${metadata.slug} is offline`), {
      statusCode: 503,
      data
    })
  }
}

/**
 * Type guard for the offline Boom marker.
 * @param {unknown} err
 * @returns {err is Boom.Boom<OfflineBoomData> & { data: OfflineBoomData }}
 */
export function isOfflineBoom(err) {
  if (!Boom.isBoom(err)) return false
  const data = /** @type {Partial<OfflineBoomData> | null | undefined} */ (
    err.data
  )
  return data?.offline === true && !!data.metadata
}

/**
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 */
