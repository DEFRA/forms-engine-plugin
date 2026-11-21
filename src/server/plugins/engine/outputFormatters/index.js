import { format as formatAdapterV1 } from '~/src/server/plugins/engine/outputFormatters/adapter/v1.js'
import { format as formatHumanV1 } from '~/src/server/plugins/engine/outputFormatters/human/v1.js'
import { format as formatMachineV1 } from '~/src/server/plugins/engine/outputFormatters/machine/v1.js'
import { format as formatMachineV2 } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'

/**
 * @typedef {(
 *   context: FormContext,
 *   items: DetailItem[],
 *   model: FormModel,
 *   submitResponse: SubmitResponsePayload,
 *   formStatus: ReturnType<typeof checkFormStatus>,
 *   formMetadata?: FormMetadata
 * ) => string} Formatter
 */

/**
 * @type {Record<
 *   string,
 *   Record<string, Formatter | typeof formatAdapterV1 | undefined> | undefined
 * >}
 */
const formatters = {
  human: {
    1: formatHumanV1
  },
  machine: {
    1: formatMachineV1,
    2: formatMachineV2
  },
  adapter: {
    1: formatAdapterV1
  }
}

/**
 * @param {string} audience
 * @param {string} version
 */
export function getFormatter(audience, version) {
  const versions = formatters[audience]

  if (!versions) {
    throw new Error('Unknown audience')
  }

  const formatter = versions[version]

  if (!formatter) {
    throw new Error('Unknown version')
  }

  return formatter
}

/**
 * @import { FormMetadata, SubmitResponsePayload } from '@defra/forms-model'
 * @import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { DetailItem } from '~/src/server/plugins/engine/models/types.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 */
