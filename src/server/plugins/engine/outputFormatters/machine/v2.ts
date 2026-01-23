import { type SubmitResponsePayload } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import {
  FileUploadField,
  PaymentField
} from '~/src/server/plugins/engine/components/index.js'
import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField,
  type DetailItemRepeat
} from '~/src/server/plugins/engine/models/types.js'
import {
  type FileUploadFieldDetailitem,
  type FormAdapterFile,
  type FormAdapterPayment,
  type FormContext,
  type PaymentFieldDetailItem,
  type RichFormValue
} from '~/src/server/plugins/engine/types.js'

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

  const meta: Record<string, unknown> = {
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
 *        createdAt: '2025-01-23T10:30:00.000Z'
 *      }
 *    }
 * }
 */
export function categoriseData(items: DetailItem[]) {
  const output: {
    main: Record<string, RichFormValue>
    repeaters: Record<string, Record<string, RichFormValue>[]>
    files: Record<
      string,
      { fileId: string; fileName: string; userDownloadLink: string }[]
    >
    payments: Record<
      string,
      {
        paymentId: string
        reference: string
        amount: number
        description: string
        createdAt: string
      }
    >
  } = { main: {}, repeaters: {}, files: {}, payments: {} }

  items.forEach((item) => {
    const { name, state } = item

    if ('subItems' in item) {
      output.repeaters[name] = extractRepeaters(item)
    } else if (isFileUploadFieldItem(item)) {
      output.files[name] = extractFileUploads(item)
    } else if (isPaymentFieldItem(item)) {
      const payment = extractPayment(item)
      if (payment) {
        output.payments[name] = payment
      }
    } else {
      output.main[name] = item.field.getFormValueFromState(state)
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
  const repeaters: Record<string, RichFormValue>[] = []

  item.subItems.forEach((inputRepeaterItem) => {
    const outputRepeaterItem: Record<string, RichFormValue> = {}

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
 * @param item - the file upload item in the form
 * @returns the file upload data
 */
function extractFileUploads(
  item: FileUploadFieldDetailitem
): FormAdapterFile[] {
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

function isFileUploadFieldItem(
  item: DetailItemField
): item is FileUploadFieldDetailitem {
  return item.field instanceof FileUploadField
}

function isPaymentFieldItem(
  item: DetailItemField
): item is PaymentFieldDetailItem {
  return item.field instanceof PaymentField
}

/**
 * Returns the "payments" section of the response body
 * @param item - the payment item in the form
 * @returns the payment data
 */
function extractPayment(
  item: PaymentFieldDetailItem
): FormAdapterPayment | undefined {
  const paymentState = item.field.getPaymentStateFromState(item.state)

  if (!paymentState) {
    return undefined
  }

  return {
    paymentId: paymentState.paymentId,
    reference: paymentState.reference,
    amount: paymentState.amount,
    description: paymentState.description,
    createdAt: paymentState.preAuth?.createdAt ?? ''
  }
}
