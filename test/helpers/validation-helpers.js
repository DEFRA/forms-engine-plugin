import { ComponentType } from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { listString } from '~/test/fixtures/list.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData } from '~/test/helpers/component-helpers.js'

/**
 * @typedef {FormComponentsDef['type']} FormComponentType
 */

/* eslint-disable jsdoc/valid-types -- the JSDoc type parser rejects a mapped type; tsc reads it */
/**
 * Definition fields for each type, where they differ from the defaults in
 * `buildComponent()`
 * @type {{
 *   [Type in FormComponentType]?: Partial<
 *     Extract<FormComponentsDef, { type: Type }>
 *   >
 * }}
 */
/* eslint-enable jsdoc/valid-types */
const EXTRA_DEFINITION_FIELDS = {
  [ComponentType.MultilineTextField]: { schema: {} },
  [ComponentType.NumberField]: { schema: {} },
  [ComponentType.FileUploadField]: { schema: {} },
  [ComponentType.RadiosField]: { list: 'listString' },
  [ComponentType.SelectField]: { list: 'listString' },
  [ComponentType.AutocompleteField]: { list: 'listString' },
  [ComponentType.CheckboxesField]: { list: 'listString' },
  [ComponentType.DeclarationField]: { content: 'Lorem ipsum dolar sit amet' },
  [ComponentType.PaymentField]: {
    options: { amount: 100, description: 'Test payment description' }
  }
}

const emptyPayment = /** @satisfies {PaymentState} */ ({
  paymentId: '',
  reference: '',
  amount: 0,
  description: '',
  uuid: '',
  formId: '',
  isLivePayment: false
})

/**
 * Form input for each type, where it differs from `getFormData()`. Each
 * input gives a validation error.
 * @type {Partial<Record<FormComponentType, FormPayload>>}
 */
const INPUTS = {
  [ComponentType.DeclarationField]: getFormData(['unchecked']),
  [ComponentType.PaymentField]: getFormData(
    /** @type {FormValue} */ (/** @type {unknown} */ (emptyPayment))
  )
}

/**
 * Build a form model with the list that list components refer to
 */
export function buildModel() {
  const updated = structuredClone(definition)
  updated.lists = [listString]

  return new FormModel(updated, { basePath: 'test' })
}

/**
 * Build a component definition for a type, with extra options merged in
 * @param {FormComponentType} type
 * @param {Partial<FormComponentsDef['options']>} [options]
 */
export function buildComponent(type, options = {}) {
  const fields = EXTRA_DEFINITION_FIELDS[type]

  return /** @type {FormComponentsDef} */ ({
    title: 'Example field',
    name: 'myComponent',
    type,
    ...fields,
    options: { ...fields?.options, ...options }
  })
}

/**
 * Get form input for a type
 * @param {FormComponentType} type
 */
export function getInput(type) {
  return INPUTS[type] ?? getFormData()
}

/**
 * @import { FormComponentsDef } from '@defra/forms-model'
 * @import { PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 * @import { FormPayload, FormValue } from '~/src/server/plugins/engine/types.js'
 */
