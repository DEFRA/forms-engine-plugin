import { ComponentType, type FormComponentsDef } from '@defra/forms-model'

import { type PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormValue
} from '~/src/server/plugins/engine/types.js'
import { listString } from '~/test/fixtures/list.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData } from '~/test/helpers/component-helpers.js'

type FormComponentType = FormComponentsDef['type']

/**
 * Definition fields for each type, where they differ from the defaults in
 * `buildComponent()`
 */
const EXTRA_DEFINITION_FIELDS: {
  [Type in FormComponentType]?: Partial<
    Extract<FormComponentsDef, { type: Type }>
  >
} = {
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

const emptyPayment = {
  paymentId: '',
  reference: '',
  amount: 0,
  description: '',
  uuid: '',
  formId: '',
  isLivePayment: false
} satisfies PaymentState

/**
 * Form input for each type, where it differs from `getFormData()`. Each
 * input gives a validation error.
 */
const INPUTS: Partial<Record<FormComponentType, FormPayload>> = {
  [ComponentType.DeclarationField]: getFormData(['unchecked']),
  [ComponentType.PaymentField]: getFormData(
    emptyPayment as unknown as FormValue
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
 */
export function buildComponent(
  type: FormComponentType,
  options: Partial<FormComponentsDef['options']> = {}
) {
  const fields = EXTRA_DEFINITION_FIELDS[type]

  return {
    title: 'Example field',
    name: 'myComponent',
    type,
    ...fields,
    options: { ...fields?.options, ...options }
  } as FormComponentsDef
}

/**
 * Get form input for a type
 */
export function getInput(type: FormComponentType) {
  return INPUTS[type] ?? getFormData()
}
