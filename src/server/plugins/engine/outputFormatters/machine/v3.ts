import { type SubmitResponsePayload } from '@defra/forms-model'

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
  formStatus: ReturnType<typeof checkFormStatus>
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

  // Extract slug from basePath as form identifier
  const formId = extractSlugFromBasePath(model.basePath) ?? ''

  const payload: FormAdapterSubmissionMessagePayload = {
    meta: {
      schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
      timestamp: new Date(),
      referenceNumber: context.referenceNumber,
      formName: model.name,
      formId,
      formSlug: model.name,
      status: formStatus.isPreview ? FormStatus.Draft : FormStatus.Live,
      isPreview: formStatus.isPreview,
      notificationEmail: ''
    },
    data: v2DataParsed.data
  }

  return JSON.stringify(payload)
}

export function extractSlugFromBasePath(basePath: string): string | null {
  // basePath formats:
  // - "slug" (live)
  // - "preview/live/slug" or "preview/draft/slug" (preview)
  const parts = basePath.split('/')
  return parts[parts.length - 1] ?? null
}

/**
 * Creates a FormAdapterSubmissionMessagePayload with custom metadata
 */
export function createPayload(
  context: FormContext,
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>,
  metadata: {
    formSlug?: string
    notificationEmail?: string
  } = {}
): FormAdapterSubmissionMessagePayload {
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

  // Extract slug from basePath as form identifier
  const formId = extractSlugFromBasePath(model.basePath) ?? ''

  return {
    meta: {
      schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
      timestamp: new Date(),
      referenceNumber: context.referenceNumber,
      formName: model.name,
      formId,
      formSlug: metadata.formSlug ?? '',
      status: formStatus.isPreview ? FormStatus.Draft : FormStatus.Live,
      isPreview: formStatus.isPreview,
      notificationEmail: metadata.notificationEmail ?? ''
    },
    data: v2DataParsed.data
  }
}
