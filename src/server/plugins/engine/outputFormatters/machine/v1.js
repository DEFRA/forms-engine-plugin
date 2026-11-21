import { config } from '~/src/config/index.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import { FileUploadField } from '~/src/server/plugins/engine/components/index.js'

const designerUrl = config.get('designerUrl')

/**
 * @param {FormContext} context
 * @param {DetailItem[]} items
 * @param {FormModel} model
 * @param {SubmitResponsePayload} _submitResponse
 * @param {ReturnType<typeof checkFormStatus>} _formStatus
 * @param {FormMetadata} [_formMetadata]
 */
export function format(
  context,
  items,
  model,
  _submitResponse,
  _formStatus,
  _formMetadata
) {
  const translator = model.createTranslator()
  const now = new Date()

  const categorisedData = categoriseData(items, translator)

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
 * @param {DetailItem[]} items
 * @param {Translator} translator
 */
function categoriseData(items, translator) {
  /**
   * @type {{
   *   main: Record<string, string>
   *   repeaters: Record<string, Record<string, string>[]>
   *   files: Record<string, Record<string, string>[]>
   * }}
   */
  const output = { main: {}, repeaters: {}, files: {} }

  items.forEach((item) => {
    if ('subItems' in item) {
      output.repeaters[item.name] = extractRepeaters(item, translator)
    } else if (isFileUploadFieldItem(item)) {
      output.files[item.name] = extractFileUploads(item)
    } else {
      output.main[item.name] = getAnswer(
        item.field,
        item.state,
        { format: 'data' },
        translator
      )
    }
  })

  return output
}

/**
 * Returns the "repeaters" section of the response body
 * @param {DetailItemRepeat} item - the repeater item
 * @param {Translator} translator
 * @returns the repeater item
 */
function extractRepeaters(item, translator) {
  /** @type {Record<string, string>[]} */
  const repeaters = []

  item.subItems.forEach((inputRepeaterItem) => {
    /** @type {Record<string, string>} */
    const outputRepeaterItem = {}

    inputRepeaterItem.forEach((repeaterComponent) => {
      outputRepeaterItem[repeaterComponent.name] = getAnswer(
        repeaterComponent.field,
        repeaterComponent.state,
        { format: 'data' },
        translator
      )
    })

    repeaters.push(outputRepeaterItem)
  })

  return repeaters
}

/**
 * Returns the "files" section of the response body
 * @param {FileUploadFieldDetailitem} item - the file upload item in the form
 * @returns the file upload data
 */
function extractFileUploads(item) {
  const fileUploadState = item.field.getContextValueFromState(item.state) ?? []

  return fileUploadState.map((fileId) => {
    return {
      fileId,
      userDownloadLink: `${designerUrl}/file-download/${fileId}`
    }
  })
}

/**
 * @param {DetailItemField} item
 * @returns {item is FileUploadFieldDetailitem}
 */
function isFileUploadFieldItem(item) {
  return item.field instanceof FileUploadField
}

/**
 * A detail item specifically for files
 * @typedef {Omit<DetailItemField, 'field'> & {
 *   field: FileUploadField
 * }} FileUploadFieldDetailitem
 */

/**
 * @import { FormMetadata, SubmitResponsePayload } from '@defra/forms-model'
 * @import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { DetailItem, DetailItemField, DetailItemRepeat } from '~/src/server/plugins/engine/models/types.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 */
