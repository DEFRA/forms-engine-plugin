import {
  Engine,
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { EN_GB } from '~/src/server/constants.js'
import {
  getFormVersion,
  type checkFormStatus
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { categoriseData } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'
import { buildConditionEvaluations } from '~/src/server/plugins/engine/pageControllers/helpers/submission.js'
import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'
import {
  type FormAdapterSubmissionMessageData,
  type FormAdapterSubmissionMessageMeta,
  type FormAdapterSubmissionMessagePayload,
  type FormAdapterSubmissionMessageResult,
  type FormContext,
  type RichFormValue
} from '~/src/server/plugins/engine/types.js'

/**
 * Maps a key-value pair to a new key-value pair, converting undefined values to null
 */
function mapper([key, value]: [string, RichFormValue | undefined]): [
  string,
  RichFormValue | null
] {
  if (value === undefined) {
    return [key, null]
  }

  return [key, value]
}

export function format(
  context: FormContext,
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>,
  formMetadata?: FormMetadata
): string {
  const csvFiles = extractCsvFiles(submitResponse)

  const { main: v2Main, ...v2Data } = categoriseData(items)

  const versionMetadata = getFormVersion(model.def)

  const meta: FormAdapterSubmissionMessageMeta = {
    schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
    timestamp: new Date(),
    referenceNumber: context.referenceNumber,
    formName: model.name,
    formId: formMetadata?.id ?? '',
    formSlug: formMetadata?.slug ?? '',
    status: formStatus.state,
    isPreview: formStatus.isPreview,
    notificationEmail: formMetadata?.notificationEmail ?? '',
    language: context.translator?.language ?? EN_GB
  }

  if (versionMetadata) {
    meta.versionMetadata = versionMetadata
  }

  const main = Object.fromEntries(Object.entries(v2Main).map(mapper))

  const repeaters = Object.fromEntries(
    Object.entries(v2Data.repeaters).map(([key, value]) => [
      key,
      value.map((item) => Object.fromEntries(Object.entries(item).map(mapper)))
    ])
  )

  const data: FormAdapterSubmissionMessageData = {
    main,
    ...v2Data,
    repeaters
  }

  const result: FormAdapterSubmissionMessageResult = {
    files: csvFiles
  }

  const payload: FormAdapterSubmissionMessagePayload = {
    meta,
    data,
    result,

    // Recorded here because only the engine holds the walked evaluation state
    // the conditions were judged against; forms-notify-listener receives the
    // flat submitted answers and resolves the outputs that qualify from these
    // outcomes alone. Condition ids are only stable in V2, so a V1 definition
    // has nothing to report - the property is still emitted, because its
    // absence is what marks a message as predating this and sends the listener
    // down its legacy path.
    conditionEvaluations:
      model.engine === Engine.V2
        ? buildConditionEvaluations(model, context)
        : []
  }

  return JSON.stringify(payload)
}

function extractCsvFiles(
  submitResponse: SubmitResponsePayload
): FormAdapterSubmissionMessageResult['files'] {
  const result =
    submitResponse.result as Partial<FormAdapterSubmissionMessageResult>

  return {
    main: result.files?.main ?? '',
    repeaters: result.files?.repeaters ?? {}
  }
}
