import { addDays, format as dateFormat } from 'date-fns'

import { config } from '~/src/config/index.js'
import { EN_GB } from '~/src/server/constants.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import { escapeMarkdown } from '~/src/server/plugins/engine/components/helpers/index.js'
import { PaymentField } from '~/src/server/plugins/engine/components/index.js'
import {
  formatCurrency,
  formatPaymentDate
} from '~/src/server/plugins/payment/helper.js'

const designerUrl = config.get('designerUrl')

/**
 * @param {FormContext} _context
 * @param {DetailItem[]} items
 * @param {FormModel} model
 * @param {SubmitResponsePayload} submitResponse
 * @param {ReturnType<typeof checkFormStatus>} formStatus
 * @param {FormMetadata} [_formMetadata]
 */
export function format(
  _context,
  items,
  model,
  submitResponse,
  formStatus,
  _formMetadata
) {
  const translator = model.createTranslator()
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

  /** @type {string[]} */
  const lines = []

  lines.push(
    `^ For security reasons, the links in this email expire at ${escapeMarkdown(formattedExpiryDate)}\n`
  )

  if (formStatus.isPreview) {
    lines.push(`This is a test of the ${formName} ${formStatus.state} form.\n`)
  }

  lines.push(`${formName} form received at ${escapeMarkdown(formattedNow)}.\n`)
  lines.push('---\n')

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
        getAnswer(item.field, item.state, { format: 'email' }, translator)
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
 * @param {DetailItem} item
 * @returns {boolean}
 */
function isPaymentItem(item) {
  if ('subItems' in item) {
    return false
  }
  return item.field instanceof PaymentField
}

/**
 * Appends the payment details section to the email lines if payment exists
 * @param {DetailItem[]} paymentItems
 * @param {string[]} lines
 */
function appendPaymentSection(paymentItems, lines) {
  if (paymentItems.length === 0) {
    return
  }

  const paymentItem = /** @type {DetailItemField} */ (paymentItems[0])
  const paymentField = /** @type {PaymentField} */ (paymentItem.field)
  const paymentState = paymentField.getPaymentStateFromState(paymentItem.state)

  if (!paymentState) {
    return
  }

  const formattedAmount = formatCurrency(paymentState.amount)
  const dateOfPayment = paymentState.preAuth?.createdAt
    ? formatPaymentDate(paymentState.preAuth.createdAt, EN_GB)
    : ''

  lines.push(
    '---\n',
    `# Your payment of ${formattedAmount} was successful\n`,
    '## Payment for\n',
    `${escapeMarkdown(paymentState.description)}\n`,
    '---\n',
    '## Total amount\n',
    `${formattedAmount}\n`,
    '---\n',
    '## Date of payment\n',
    `${escapeMarkdown(dateOfPayment)}\n`,
    '---\n'
  )
}

/**
 * @import { FormMetadata, SubmitResponsePayload } from '@defra/forms-model'
 * @import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { DetailItem, DetailItemField } from '~/src/server/plugins/engine/models/types.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 */
