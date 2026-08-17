import {
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { buildPayload } from '~/src/server/plugins/engine/outputFormatters/adapter/common.js'
import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'

export function format(
  context: FormContext,
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>,
  formMetadata?: FormMetadata
): string {
  const payload = buildPayload(
    FormAdapterSubmissionSchemaVersion.V1,
    context,
    items,
    model,
    submitResponse,
    formStatus,
    formMetadata
  )

  return JSON.stringify(payload)
}
