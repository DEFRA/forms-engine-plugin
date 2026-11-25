import { config } from '~/src/config/index.js'
import {
  FileUploadField,
  PaymentField
} from '~/src/server/plugins/engine/components/index.js'

/**
 * Payment data for the machine output format
 * Defined locally to avoid circular dependency with types.js
 * @typedef {{
 *   paymentId: string
 *   reference: string
 *   amount: number
 *   description: string
 *   descriptionInEng?: string
 *   createdAt: string
 * }} PaymentOutput
 */

const designerUrl = config.get('designerUrl')

/**
 * @param {FormContext} context
 * @param {DetailItem[]} items
 * @param {FormModel} model
 * @param {SubmitResponsePayload} _submitResponse
 * @param {ReturnType<typeof checkFormStatus>} _formStatus
 */
export function format(context, items, model, _submitResponse, _formStatus) {
  const now = new Date()

  const categorisedData = categoriseData(items)

  /** @type {Record<string, unknown>} */
  const meta = {
    schemaVersion: '2',
    timestamp: now.toISOString(),
    definition: model.def,
    referenceNumber: context.referenceNumber
  }

  const data = {
    meta,
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
 *          textComponentName: 'componentValue'
 *        },
 *        {
 *          richComponentName: { foo: 'bar', 'baz': true }
 *        }
 *      ]
 *    },
 *    files: {
 *      fileComponentName: [
 *        {
 *          fileId: '123-456-789',
 *          fileName: 'example.pdf',
 *          userDownloadLink: 'https://forms-designer/file-download/123-456-789'
 *        }
 *      ]
 *    },
 *    payments: {
 *      paymentComponentName: {
 *        paymentId: 'abc123',
 *        reference: 'REF-123',
 *        amount: 10.00,
 *        description: 'Application fee',
 *        descriptionInEng: 'Applicaiton fee',
 *        createdAt: '2025-01-23T10:30:00.000Z'
 *      }
 *    }
 * }
 * @param {DetailItem[]} items
 */
export function categoriseData(items) {
  /**
   * @type {{
   *   main: Record<string, RichFormValue>
   *   repeaters: Record<string, Record<string, RichFormValue>[]>
   *   files: Record<
   *     string,
   *     { fileId: string; fileName: string; userDownloadLink: string }[]
   *   >
   *   payment?: PaymentOutput
   * }}
   */
  const output = { main: {}, repeaters: {}, files: {} }

  items.forEach((item) => {
    const { name, state } = item

    if ('subItems' in item) {
      output.repeaters[name] = extractRepeaters(item)
    } else if (isFileUploadFieldItem(item)) {
      output.files[name] = extractFileUploads(item)
    } else if (isPaymentFieldItem(item)) {
      const payment = extractPayment(item)
      if (payment) {
        output.payment = payment
      }
    } else {
      output.main[name] = item.field.getFormValueFromState(state)
    }
  })

  return output
}

/**
 * Returns the "repeaters" section of the response body
 * @param {DetailItemRepeat} item - the repeater item
 * @returns the repeater item
 */
function extractRepeaters(item) {
  /** @type {Record<string, RichFormValue>[]} */
  const repeaters = []

  item.subItems.forEach((inputRepeaterItem) => {
    /** @type {Record<string, RichFormValue>} */
    const outputRepeaterItem = {}

    inputRepeaterItem.forEach((repeaterComponent) => {
      const { field, state } = repeaterComponent

      outputRepeaterItem[repeaterComponent.name] =
        field.getFormValueFromState(state)
    })

    repeaters.push(outputRepeaterItem)
  })

  return repeaters
}

/**
 * Returns the "files" section of the response body
 * @param {FileUploadFieldDetailitem} item - the file upload item in the form
 * @returns {FormAdapterFile[]} the file upload data
 */
function extractFileUploads(item) {
  const fileUploadState = item.field.getFormValueFromState(item.state) ?? []

  return fileUploadState.map((fileState) => {
    const { file } = fileState.status.form
    return {
      fileId: file.fileId,
      fileName: file.filename,
      userDownloadLink: `${designerUrl}/file-download/${file.fileId}`
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
 * @param {DetailItemField} item
 * @returns {item is DetailItemField & {
 *   field: PaymentField
 * }}
 */
function isPaymentFieldItem(item) {
  return item.field instanceof PaymentField
}

/**
 * Returns the "payments" section of the response body
 * @param {DetailItemField & { field: PaymentField }} item - the payment item in the form
 * @returns {PaymentOutput | undefined} the payment data
 */
function extractPayment(item) {
  const paymentState = item.field.getPaymentStateFromState(item.state)

  if (!paymentState) {
    return undefined
  }

  return {
    paymentId: paymentState.paymentId,
    reference: paymentState.reference,
    amount: paymentState.amount,
    description: paymentState.description,
    descriptionInEng: item.field.def.options.description,
    createdAt: paymentState.preAuth?.createdAt ?? ''
  }
}

/**
 * @import { SubmitResponsePayload } from '@defra/forms-model'
 * @import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { DetailItem, DetailItemField, DetailItemRepeat } from '~/src/server/plugins/engine/models/types.js'
 * @import { FileUploadFieldDetailitem, FormAdapterFile, FormContext, RichFormValue } from '~/src/server/plugins/engine/types.js'
 */
