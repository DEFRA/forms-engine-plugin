import {
  isConditionWrapperV2,
  type ConditionDataV2,
  type ConditionRefDataV2,
  type ConditionWrapperV2,
  type SubmitConditionEvaluation,
  type SubmitConditionReference,
  type SubmitPayload
} from '@defra/forms-model'

import { GeospatialField } from '~/src/server/plugins/engine/components/GeospatialField.js'
import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type DetailItem,
  type DetailItemField
} from '~/src/server/plugins/engine/models/types.js'
import {
  type FormContext,
  type FormState,
  type FormStateValue
} from '~/src/server/plugins/engine/types.js'
import {
  formatCurrency,
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
export function buildMainRecords(
  items: DetailItem[],
  translator: Translator
): SubmitRecord[] {
  const fieldItems = items.filter(
    (item): item is DetailItemField => 'field' in item
  )

  const records: SubmitRecord[] = []

  for (const item of fieldItems) {
    if (item.field instanceof PaymentField) {
      records.push(...buildPaymentRecords(item, translator))
    } else if (item.field instanceof GeospatialField) {
      // Stringify of GeoJSON is done here rather than inside `getContextValueFromState`
      // so we don't incur the overhead of JSON.stringify on every request when building context
      const value = item.field.getFormValueFromState(item.state)
      records.push({
        name: item.name,
        title: item.label,
        value: value === undefined ? '' : JSON.stringify(value)
      })
    } else {
      records.push({
        name: item.name,
        title: item.label,
        value: getAnswer(item.field, item.state, translator, { format: 'data' })
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
export function buildPaymentRecords(
  item: DetailItemField,
  translator: Translator
): SubmitRecord[] {
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
      value: formatCurrency(paymentState.amount)
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
        ? formatPaymentDate(paymentState.preAuth.createdAt, translator.language)
        : ''
    }
  ]
}

/**
 * Builds the repeater submission records from repeater items.
 */
export function buildRepeaterRecords(
  items: DetailItem[],
  translator: Translator
): SubmitPayload['repeaters'] {
  return items
    .filter((item) => 'subItems' in item)
    .map((item) => ({
      name: item.name,
      title: item.label,
      value: item.subItems.map((detailItems) =>
        detailItems.map((subItem) => {
          let value

          if (subItem.field instanceof GeospatialField) {
            // Stringify of GeoJSON is done here rather than inside `getContextValueFromState`
            // so we don't incur the overhead of JSON.stringify on every request when building context
            const formValue = subItem.field.getFormValueFromState(subItem.state)
            value = formValue === undefined ? '' : JSON.stringify(formValue)
          } else {
            value = getAnswer(subItem.field, subItem.state, translator, {
              format: 'data'
            })
          }

          return {
            name: subItem.name,
            title: subItem.label,
            value
          }
        })
      )
    }))
}

/**
 * Records the outcome of every condition in the form definition, evaluated
 * against the answers as they stand at the point of submission.
 *
 * Evaluated here rather than by the consumer because only the engine holds
 * the context to evaluate against: `evaluationState` is built by walking the
 * form from its start page along the path taken, applying page conditions as
 * it goes. A consumer receives the flat submitted answers, not that walked
 * state, and reproducing the walk in a second codebase would leave two
 * implementations of the same logic free to diverge.
 *
 * Each record carries the components the condition depends on and whether each
 * was answered. An unanswered question still yields a boolean - negative
 * operators such as "is not" return `true` against the seeded `null` - so the
 * outcome alone cannot be read as evidence that the user gave that answer.
 *
 * V2 definitions only. `conditionId` is the V2 condition id, and the
 * references are resolved from the component ids V2 conditions carry - V1
 * conditions reference components by name, and V1 components need not have
 * an id at all.
 */
export function buildConditionEvaluations(
  model: FormModel,
  context: FormContext
): SubmitConditionEvaluation[] {
  const { evaluationState } = context

  return model.def.conditions
    .filter(isConditionWrapperV2)
    .flatMap((conditionDef) => {
      const condition = model.conditions[conditionDef.id]

      if (!condition) {
        return []
      }

      const { outcome } = condition.evaluate(evaluationState)

      const references = collectReferences(
        model,
        conditionDef,
        evaluationState,
        new Map(),
        new Set()
      )

      return {
        conditionId: conditionDef.id,
        outcome,
        references: [...references.values()]
      }
    })
}

/**
 * Whether a component held an answer at the point a condition was evaluated.
 *
 * The engine seeds every component in `evaluationState` with `null` before the
 * page walk begins, so an unanswered question is present but empty rather than
 * absent.
 * @see {@link FormModel.initialiseContext}
 */
function isAnswered(value: FormStateValue | undefined) {
  if (value === undefined || value === null) {
    return false
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== ''
}

function isConditionDataV2(
  item: ConditionDataV2 | ConditionRefDataV2
): item is ConditionDataV2 {
  return 'componentId' in item
}

/**
 * Collects every component a condition depends on, following nested condition
 * references. Results are keyed by component id so a component referenced more
 * than once is reported once.
 */
function collectReferences(
  model: FormModel,
  conditionDef: ConditionWrapperV2,
  evaluationState: FormState,
  references: Map<string, SubmitConditionReference>,
  visited: Set<string>
) {
  if (visited.has(conditionDef.id)) {
    return references
  }

  visited.add(conditionDef.id)

  for (const item of conditionDef.items) {
    if (isConditionDataV2(item)) {
      const component = model.getComponentById(item.componentId)

      // A condition referencing a component that no longer exists cannot be
      // resolved to a name, so there is nothing meaningful to report for it
      if (component) {
        references.set(item.componentId, {
          componentId: item.componentId,
          componentName: component.name,
          answered: isAnswered(evaluationState[component.name])
        })
      }

      continue
    }

    const referenced = model.getConditionById(item.conditionId)

    if (referenced) {
      collectReferences(model, referenced, evaluationState, references, visited)
    }
  }

  return references
}
