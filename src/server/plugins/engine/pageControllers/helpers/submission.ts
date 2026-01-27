import { type SubmitPayload } from '@defra/forms-model'

import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import {
  type DetailItem,
  type DetailItemField
} from '~/src/server/plugins/engine/models/types.js'
import {
  formatPaymentAmount,
  formatPaymentDate
} from '~/src/server/plugins/payment/helper.js'

export interface SubmitRecord {
  name: string
  title: string
  value: string
}

/**
 * Builds the main submission records from field items.
 * Regular fields are converted to single records, while PaymentField
 * components are expanded into four separate records.
 */
export function buildMainRecords(items: DetailItem[]): SubmitRecord[] {
  const fieldItems = items.filter(
    (item): item is DetailItemField => 'field' in item
  )

  const records: SubmitRecord[] = []

  for (const item of fieldItems) {
    if (item.field instanceof PaymentField) {
      records.push(...buildPaymentRecords(item))
    } else {
      records.push({
        name: item.name,
        title: item.label,
        value: getAnswer(item.field, item.state, { format: 'data' })
      })
    }
  }

  return records
}

/**
 * Expands a PaymentField into four submission records:
 * - Payment description
 * - Payment amount (formatted with currency symbol)
 * - Payment reference
 * - Payment date (formatted date/time)
 *
 * Returns an empty array if no payment state exists.
 */
export function buildPaymentRecords(item: DetailItemField): SubmitRecord[] {
  const paymentState = (item.field as PaymentField).getPaymentStateFromState(
    item.state
  )

  if (!paymentState) {
    return []
  }

  return [
    {
      name: `${item.name}_paymentDescription`,
      title: 'Payment description',
      value: paymentState.description
    },
    {
      name: `${item.name}_paymentAmount`,
      title: 'Payment amount',
      value: formatPaymentAmount(paymentState.amount)
    },
    {
      name: `${item.name}_paymentReference`,
      title: 'Payment reference',
      value: paymentState.reference
    },
    {
      name: `${item.name}_paymentDate`,
      title: 'Payment date',
      value: paymentState.preAuth?.createdAt
        ? formatPaymentDate(paymentState.preAuth.createdAt)
        : ''
    }
  ]
}

/**
 * Builds the repeater submission records from repeater items.
 */
export function buildRepeaterRecords(
  items: DetailItem[]
): SubmitPayload['repeaters'] {
  return items
    .filter((item) => 'subItems' in item)
    .map((item) => ({
      name: item.name,
      title: item.label,
      value: item.subItems.map((detailItems) =>
        detailItems.map((subItem) => ({
          name: subItem.name,
          title: subItem.label,
          value: getAnswer(subItem.field, subItem.state, { format: 'data' })
        }))
      )
    }))
}
