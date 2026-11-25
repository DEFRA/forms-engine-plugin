import { Engine } from '@defra/forms-model'

import { EN_GB } from '~/src/server/constants.js'
import { getFormVersion } from '~/src/server/plugins/engine/helpers.js'
import { categoriseData } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'
import { buildConditionEvaluations } from '~/src/server/plugins/engine/pageControllers/helpers/submission.js'
import { FormAdapterSubmissionSchemaVersion } from '~/src/server/plugins/engine/types/enums.js'

/**
 * Maps a key-value pair to a new key-value pair, converting undefined values to null
 * @param {[string, RichFormValue | undefined]} param0
 * @returns {[string, RichFormValue | null]}
 */
function mapper([key, value]) {
  if (value === undefined) {
    return [key, null]
  }

  return [key, value]
}

/**
 * @param {FormContext} context
 * @param {DetailItem[]} items
 * @param {FormModel} model
 * @param {SubmitResponsePayload} submitResponse
 * @param {ReturnType<typeof checkFormStatus>} formStatus
 * @param {FormMetadata} [formMetadata]
 * @returns {string}
 */
export function format(
  context,
  items,
  model,
  submitResponse,
  formStatus,
  formMetadata
) {
  const csvFiles = extractCsvFiles(submitResponse)

  const { main: v2Main, ...v2Data } = categoriseData(items)

  const versionMetadata = getFormVersion(model.def)

  /** @type {FormAdapterSubmissionMessageMeta} */
  const meta = {
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

  /** @type {FormAdapterSubmissionMessageData} */
  const data = {
    main,
    ...v2Data,
    repeaters
  }

  /** @type {FormAdapterSubmissionMessageResult} */
  const result = {
    files: csvFiles
  }

  /** @type {FormAdapterSubmissionMessagePayload} */
  const payload = {
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

/**
 * @param {SubmitResponsePayload} submitResponse
 * @returns {FormAdapterSubmissionMessageResult['files']}
 */
function extractCsvFiles(submitResponse) {
  const result = /** @type {Partial<FormAdapterSubmissionMessageResult>} */ (
    submitResponse.result
  )

  return {
    main: result.files?.main ?? '',
    repeaters: result.files?.repeaters ?? {}
  }
}

/**
 * @import { FormMetadata, SubmitResponsePayload } from '@defra/forms-model'
 * @import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { DetailItem } from '~/src/server/plugins/engine/models/types.js'
 * @import { FormAdapterSubmissionMessageData, FormAdapterSubmissionMessageMeta, FormAdapterSubmissionMessagePayload, FormAdapterSubmissionMessageResult, FormContext, RichFormValue } from '~/src/server/plugins/engine/types.js'
 */
