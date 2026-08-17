import {
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { buildPayload } from '~/src/server/plugins/engine/outputFormatters/adapter/common.js'
import { buildNotificationTargets } from '~/src/server/plugins/engine/pageControllers/helpers/submission.js'
import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'

/**
 * Adapter V1 plus `notificationTargets` - see
 * {@link FormAdapterSubmissionSchemaVersion.V2}.
 */
export function format(
  context: FormContext,
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>,
  formMetadata?: FormMetadata
): string {
  const payload = buildPayload(
    FormAdapterSubmissionSchemaVersion.V2,
    context,
    items,
    model,
    submitResponse,
    formStatus,
    formMetadata
  )

  // Resolved here rather than by the adapter so that output conditions are
  // evaluated against the answers as they stood at submission. An adapter
  // re-reading the definition later would see whatever the form has since been
  // edited into, and has no submission state to evaluate against.
  payload.notificationTargets = buildNotificationTargets(
    model,
    context,
    formMetadata?.notificationEmail,
    // Fallback for the `notificationEmail` target when the definition has no
    // `output` block. V1 messages carry no `notificationTargets`, so
    // forms-notify-listener recovers them from the live definition and applies
    // this same `human`/`2` fallback - see `sendNotifyEmailsLegacy` in
    // `src/service/notify-legacy.js` there. Changing either side alone means a
    // form with no `output` starts being sent against a different template.
    { audience: 'human', version: '2' }
  )

  return JSON.stringify(payload)
}
