import {
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'
import { addDays, format as dateFormat } from 'date-fns'

import { config } from '~/src/config/index.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import { escapeMarkdown } from '~/src/server/plugins/engine/components/helpers/index.js'
import { PaymentField } from '~/src/server/plugins/engine/components/index.js'
import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField
} from '~/src/server/plugins/engine/models/types.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'

const designerUrl = config.get('designerUrl')

export function format(
  _context: FormContext,
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>,
  _formMetadata?: FormMetadata
) {
  const { files } = submitResponse.result

  const formName = escapeMarkdown(model.name)

  /**
   * @todo Refactor this below but the code to
   * generate the question and answers works for now
   */
  const now = new Date()
  const formattedNow = `${dateFormat(now, 'h:mmaaa')} on ${dateFormat(now, 'd MMMM yyyy')}`

  const fileExpiryDate = addDays(now, 90)
  const formattedExpiryDate = `${dateFormat(fileExpiryDate, 'h:mmaaa')} on ${dateFormat(fileExpiryDate, 'eeee d MMMM yyyy')}`

  const lines: string[] = []

  lines.push(
    `^ For security reasons, the links in this email expire at ${escapeMarkdown(formattedExpiryDate)}\n`
  )

  if (formStatus.isPreview) {
    lines.push(`This is a test of the ${formName} ${formStatus.state} form.\n`)
  }

  lines.push(`${formName} form received at ${escapeMarkdown(formattedNow)}.\n`)
  lines.push('---\n')

  // Separate payment items from regular items
  const regularItems = items.filter((item) => !isPaymentItem(item))
  const paymentItems = items.filter((item) => isPaymentItem(item))

  regularItems.forEach((item) => {
    const label = escapeMarkdown(item.label)

    lines.push(`## ${label}\n`)

    if ('subItems' in item) {
      const filename = escapeMarkdown(`Download ${label} (CSV)`)
      const fileId = files.repeaters[item.name]

      lines.push(`[${filename}](${designerUrl}/file-download/${fileId})\n`)
    } else {
      lines.push(
        getAnswer(item.field, item.state, {
          format: 'email'
        })
      )
    }

    lines.push('---\n')
  })

  const filename = escapeMarkdown('Download main form (CSV)')
  lines.push(`[${filename}](${designerUrl}/file-download/${files.main})\n`)

  appendPaymentSection(paymentItems, lines)

  return lines.join('\n')
}

/**
 * Check if an item is a PaymentField
 */
function isPaymentItem(item: DetailItem): boolean {
  if ('subItems' in item) {
    return false
  }
  return item.field instanceof PaymentField
}

/**
 * Appends the payment details section to the email lines if payment exists
 */
function appendPaymentSection(paymentItems: DetailItem[], lines: string[]) {
  if (paymentItems.length === 0) {
    return
  }

  // Get the first payment item (forms only have one payment)
  const paymentItem = paymentItems[0] as DetailItemField
  const paymentField = paymentItem.field as PaymentField
  const paymentState = paymentField.getPaymentStateFromState(paymentItem.state)

  if (!paymentState) {
    return
  }

  const dateOfPayment = paymentState.preAuth?.createdAt
    ? `${dateFormat(new Date(paymentState.preAuth.createdAt), 'h:mmaaa')} on ${dateFormat(new Date(paymentState.preAuth.createdAt), 'd MMMM yyyy')}`
    : ''

  lines.push('---\n')
  lines.push(`# Your payment of £${paymentState.amount} was successful\n`)
  lines.push('## Payment for\n')
  lines.push(`${escapeMarkdown(paymentState.description)}\n`)
  lines.push('---\n')
  lines.push('## Total amount\n')
  lines.push(`£${paymentState.amount}\n`)
  lines.push('---\n')
  lines.push('## Date of payment\n')
  lines.push(`${escapeMarkdown(dateOfPayment)}\n`)
  lines.push('---\n')
}
