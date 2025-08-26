import {
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { format as machineV2 } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'
import {
  FormAdapterSubmissionSchemaVersion,
  type FormAdapterSubmissionMessageData,
  type FormAdapterSubmissionMessagePayload,
  type FormContext
} from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'

export function format(
  context: FormContext,
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>,
  formMetadata?: FormMetadata
): string {
  const v2DataString = machineV2(
    context,
    items,
    model,
    submitResponse,
    formStatus
  )
  const v2DataParsed = JSON.parse(v2DataString) as {
    data: FormAdapterSubmissionMessageData
  }

  const payload: FormAdapterSubmissionMessagePayload = {
    meta: {
      schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
      timestamp: new Date(),
      referenceNumber: context.referenceNumber,
      formName: model.name,
      formId: formMetadata?.id ?? '',
      formSlug: formMetadata?.slug ?? '',
      status: formStatus.isPreview ? FormStatus.Draft : FormStatus.Live,
      isPreview: formStatus.isPreview,
      notificationEmail: formMetadata?.notificationEmail ?? ''
    },
    data: v2DataParsed.data
  }

  return JSON.stringify(payload)
}
