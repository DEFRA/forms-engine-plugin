import { type SubmitResponsePayload } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers.js'
import { FileUploadField } from '~/src/server/plugins/engine/components/index.js'
import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField,
  type DetailItemRepeat
} from '~/src/server/plugins/engine/models/types.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'

const designerUrl = config.get('designerUrl')

export function format(
  context: FormContext,
  items: DetailItem[],
  model: FormModel,
  _submitResponse: SubmitResponsePayload,
  _formStatus: ReturnType<typeof checkFormStatus>
) {
  const now = new Date()

  const categorisedData = categoriseData(items)

  const data = {
    meta: {
      schemaVersion: '1',
      timestamp: now.toISOString(),
      referenceNumber: context.referenceNumber,
      definition: model.def
    },
    data: categorisedData
  }

  const body = JSON.stringify(data)

  return body
}

/**
 * Categories the form submission data into the "main" body and "repeaters".
 *
 * {
 *    main: {
 *       componentName: 'componentValue',
 *    },
 *    repeaters: {
 *      repeaterName: [
 *        {
 *          componentName: 'componentValue'
 *        }
 *      ]
 *    },
 *    files: {
 *      fileComponentName: [
 *        {
 *          fileId: '123-456-789',
 *          link: 'https://forms-designer/file-download/123-456-789'
 *        }
 *      ]
 *    }
 * }
 */
function categoriseData(items: DetailItem[]) {
  const output: {
    main: Record<string, string>
    repeaters: Record<string, Record<string, string>[]>
    files: Record<string, Record<string, string>[]>
  } = { main: {}, repeaters: {}, files: {} }

  items.forEach((item) => {
    if ('subItems' in item) {
      output.repeaters[item.name] = extractRepeaters(item)
    } else if (isFileUploadFieldItem(item)) {
      output.files[item.name] = extractFileUploads(item)
    } else {
      output.main[item.name] = getAnswer(item.field, item.state, {
        format: 'data'
      })
    }
  })

  return output
}

/**
 * Returns the "repeaters" section of the response body
 * @param item - the repeater item
 * @returns the repeater item
 */
function extractRepeaters(item: DetailItemRepeat) {
  const repeaters: Record<string, string>[] = []

  item.subItems.forEach((inputRepeaterItem) => {
    const outputRepeaterItem: Record<string, string> = {}

    inputRepeaterItem.forEach((repeaterComponent) => {
      outputRepeaterItem[repeaterComponent.name] = getAnswer(
        repeaterComponent.field,
        repeaterComponent.state,
        {
          format: 'data'
        }
      )
    })

    repeaters.push(outputRepeaterItem)
  })

  return repeaters
}

/**
 * Returns the "files" section of the response body
 * @param item - the file upload item in the form
 * @returns the file upload data
 */
function extractFileUploads(item: FileUploadFieldDetailitem) {
  const fileUploadState = item.field.getContextValueFromState(item.state) ?? []

  return fileUploadState.map((fileId) => {
    return {
      fileId,
      userDownloadLink: `${designerUrl}/file-download/${fileId}`
    }
  })
}

function isFileUploadFieldItem(
  item: DetailItemField
): item is FileUploadFieldDetailitem {
  return item.field instanceof FileUploadField
}

/**
 * A detail item specifically for files
 */
type FileUploadFieldDetailitem = Omit<DetailItemField, 'field'> & {
  field: FileUploadField
}
