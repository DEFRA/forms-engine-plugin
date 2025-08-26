import {
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { format as formatAdapterV1 } from '~/src/server/plugins/engine/outputFormatters/adapter/v1.js'
import { format as formatHumanV1 } from '~/src/server/plugins/engine/outputFormatters/human/v1.js'
import { format as formatMachineV1 } from '~/src/server/plugins/engine/outputFormatters/machine/v1.js'
import { format as formatMachineV2 } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'

type Formatter = (
  context: FormContext,
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>,
  formMetadata?: FormMetadata
) => string

const formatters: Record<
  string,
  Record<string, Formatter | typeof formatAdapterV1 | undefined> | undefined
> = {
  human: {
    '1': formatHumanV1
  },
  machine: {
    '1': formatMachineV1,
    '2': formatMachineV2
  },
  adapter: {
    '1': formatAdapterV1
  }
}

export function getFormatter(audience: string, version: string) {
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
