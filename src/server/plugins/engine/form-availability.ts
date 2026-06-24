import { FormStatus, type FormMetadata } from '@defra/forms-model'
import Boom from '@hapi/boom'

export interface OfflineBoomData {
  offline: true
  metadata: FormMetadata
}

/**
 * Throws when the form has been taken offline. The plugin's
 * unavailable-response extension catches the marker and renders the
 * "Sorry, this form is unavailable" view at HTTP 200.
 */
export function assertFormAvailable(
  metadata: FormMetadata,
  formState: FormStatus,
  isPreview: boolean
): void {
  if (
    metadata.offline === true &&
    formState === FormStatus.Live &&
    !isPreview
  ) {
    const data: OfflineBoomData = { offline: true, metadata }
    throw Boom.boomify(new Error(`Form ${metadata.slug} is offline`), {
      statusCode: 503,
      data
    })
  }
}

/** Type guard for the offline Boom marker. */
export function isOfflineBoom(
  err: unknown
): err is Boom.Boom<OfflineBoomData> & { data: OfflineBoomData } {
  if (!Boom.isBoom(err)) return false
  const data = err.data as Partial<OfflineBoomData> | null | undefined
  return data?.offline === true && !!data.metadata
}
