import {
  hasComponentsEvenIfNoNext,
  hasFormField,
  slugSchema
} from '@defra/forms-model'
import Joi from 'joi'

import { FORM_PREFIX } from '~/src/server/constants.js'
import * as service from '~/src/server/plugins/postcode-lookup/service.js'
import {
  crumbSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'

// Field names/ids
const postcodeQueryFieldName = 'postcodeQuery'
const buildingNameQueryFieldName = 'buildingNameQuery'
const uprnFieldName = 'uprn'

const line1FieldName = 'addressLine1'
const line2FieldName = 'addressLine2'
const townFieldName = 'town'
const countyFieldName = 'county'
const postcodeFieldName = 'postcode'

const selectLabelText = 'Select an address'

export const steps = {
  // Step 1: Postcode/building name input
  details: 'details',
  // Step 2: Select address
  select: 'select',
  // Step 3: Manual address
  manual: 'manual'
}

export const JOURNEY_BASE_URL = '/postcode-lookup'

/**
 * Build form errors
 * @param {Error} [err]
 */
function buildErrors(err) {
  const hasErrors = Joi.isError(err) && err.details.length > 0

  if (!hasErrors) {
    return {}
  }

  /**
   * Get error by path
   * @param {string} fieldName
   */
  const getError = (fieldName) => {
    return err.details.find((item) => item.path[0] === fieldName)
  }

  const postcodeQueryError = getError(postcodeQueryFieldName)
  const buildingNameQueryError = getError(buildingNameQueryFieldName)
  const uprnError = getError(uprnFieldName)
  const line1Error = getError(line1FieldName)
  const line2Error = getError(line2FieldName)
  const townError = getError(townFieldName)
  const countyError = getError(countyFieldName)
  const postcodeError = getError(postcodeFieldName)

  /**
   * @type {{ text: string, href: string }[]}
   */
  const errors = []

  /**
   * Push error
   * @param {string} fieldName - the field name
   * @param {ValidationErrorItem} [item] - the joi validation error
   */
  const pushError = (fieldName, item) => {
    if (item) {
      errors.push({
        text: item.message,
        href: `#${fieldName}`
      })
    }
  }

  pushError(postcodeQueryFieldName, postcodeQueryError)
  pushError(buildingNameQueryFieldName, buildingNameQueryError)
  pushError(uprnFieldName, uprnError)
  pushError(line1FieldName, line1Error)
  pushError(line2FieldName, line2Error)
  pushError(townFieldName, townError)
  pushError(countyFieldName, countyError)
  pushError(postcodeFieldName, postcodeError)

  return {
    errors,
    postcodeQueryError,
    buildingNameQueryError,
    uprnError,
    line1Error,
    line2Error,
    townError,
    countyError,
    postcodeError
  }
}

/**
 * Search ordnance survey for addresses
 * @param {string} postcodeQuery
 * @param {string} buildingNameQuery
 * @param {string} apiKey
 */
async function getAddresses(postcodeQuery, buildingNameQuery, apiKey) {
  const addresses = await service.search(
    postcodeQuery,
    buildingNameQuery,
    apiKey
  )
  const addressCount = addresses.length
  const singleAddress = addressCount === 1 ? addresses.at(0) : undefined
  const hasAddresses = addressCount > 0
  const hasMultipleAddresses = addressCount > 1

  return {
    hasAddresses,
    hasMultipleAddresses,
    singleAddress,
    addresses,
    addressCount
  }
}

/**
 * @param {string} slug
 * @param {FormStatus} [status]
 */
function constructFormUrl(slug, status) {
  if (!status) {
    return `${FORM_PREFIX}/${slug}`
  }

  return `${FORM_PREFIX}/preview/${status}/${slug}`
}

/**
 * Get the details view fields
 * @param {PostcodeLookupDetailsPayload | undefined} payload
 * @param {OptionalValidationErrorItem} postcodeQueryError
 * @param {OptionalValidationErrorItem} buildingNameQueryError
 */
function getDetailsFields(payload, postcodeQueryError, buildingNameQueryError) {
  return {
    [postcodeQueryFieldName]: {
      id: postcodeQueryFieldName,
      name: postcodeQueryFieldName,
      label: {
        text: 'Postcode'
      },
      hint: {
        text: 'For example, AA3 1AB'
      },
      value: payload?.postcodeQuery,
      errorMessage: postcodeQueryError && { text: postcodeQueryError.message }
    },
    [buildingNameQueryFieldName]: {
      id: buildingNameQueryFieldName,
      name: buildingNameQueryFieldName,
      label: {
        text: 'Building name or number (optional)'
      },
      hint: {
        text: 'For example, 15 or Prospect Cottage'
      },
      value: payload?.buildingNameQuery,
      errorMessage: buildingNameQueryError && {
        text: buildingNameQueryError.message
      }
    }
  }
}

/**
 * Get the select view fields
 * @param {PostcodeLookupDetailsData} details
 * @param {boolean} hasMultipleAddresses
 * @param {Address | undefined} singleAddress
 * @param {PostcodeLookupSelectPayload | undefined} payload
 * @param {OptionalValidationErrorItem} uprnError
 * @param {Address[]} addresses
 */
function getSelectViewFields(
  details,
  hasMultipleAddresses,
  singleAddress,
  payload,
  uprnError,
  addresses
) {
  return {
    [postcodeQueryFieldName]: {
      id: postcodeQueryFieldName,
      name: postcodeQueryFieldName,
      type: 'hidden',
      value: details.postcodeQuery
    },
    [buildingNameQueryFieldName]: {
      id: buildingNameQueryFieldName,
      name: buildingNameQueryFieldName,
      type: 'hidden',
      value: details.buildingNameQuery
    },
    [uprnFieldName]: {
      id: uprnFieldName,
      name: uprnFieldName,
      label: hasMultipleAddresses
        ? {
            text: selectLabelText
          }
        : undefined,
      value: singleAddress ? singleAddress.uprn : payload?.uprn,
      errorMessage: uprnError && { text: uprnError.message },
      items: hasMultipleAddresses
        ? [{ text: selectLabelText }].concat(
            addresses.map((item) => ({
              text: item.address,
              value: item.uprn
            }))
          )
        : undefined,
      type: singleAddress ? 'hidden' : undefined
    }
  }
}

/**
 * Get the manual view fields
 * @param {PostcodeLookupManualPayload | undefined} payload
 * @param {OptionalValidationErrorItem} line1Error
 * @param {OptionalValidationErrorItem} line2Error
 * @param {OptionalValidationErrorItem} townError
 * @param {OptionalValidationErrorItem} countyError
 * @param {OptionalValidationErrorItem} postcodeError
 */
function getManualFields(
  payload,
  line1Error,
  line2Error,
  townError,
  countyError,
  postcodeError
) {
  return {
    [line1FieldName]: {
      id: line1FieldName,
      name: line1FieldName,
      label: {
        text: 'Address line 1'
      },
      value: payload?.addressLine1,
      errorMessage: line1Error && { text: line1Error.message }
    },
    [line2FieldName]: {
      id: line2FieldName,
      name: line2FieldName,
      label: {
        text: 'Address line 2 (optional)'
      },
      value: payload?.addressLine2,
      errorMessage: line2Error && { text: line2Error.message }
    },
    [townFieldName]: {
      id: townFieldName,
      name: townFieldName,
      label: {
        text: 'Town or city'
      },
      value: payload?.town,
      errorMessage: townError && { text: townError.message }
    },
    [countyFieldName]: {
      id: countyFieldName,
      name: countyFieldName,
      label: {
        text: 'County (optional)'
      },
      value: payload?.county,
      errorMessage: countyError && { text: countyError.message }
    },
    [postcodeFieldName]: {
      id: postcodeFieldName,
      name: postcodeFieldName,
      label: {
        text: 'Postcode'
      },
      value: payload?.postcode,
      errorMessage: postcodeError && { text: postcodeError.message }
    }
  }
}

/**
 * @param {string} formPath
 * @param {string} path
 */
function constructFormPageUrl(formPath, path) {
  return `${formPath}${path}`
}

/**
 * Postcode lookup params schema
 */
export const paramsSchema = Joi.object()
  .keys({
    slug: slugSchema,
    path: pathSchema,
    componentName: Joi.string().required(),
    state: stateSchema.optional()
  })
  .required()

export const stepSchema = Joi.string()
  .valid(...Object.keys(steps))
  .required()

const sharedPayloadSchemaKeys = {
  crumb: crumbSchema,
  step: stepSchema,
  [postcodeQueryFieldName]: Joi.string().required().messages({
    '*': 'Enter a postcode'
  }),
  [buildingNameQueryFieldName]: Joi.string().required().allow('').trim()
}

/**
 * Postcode lookup details form payload schema
 * @type {ObjectSchema<PostcodeLookupDetailsPayload>}
 */
export const detailsPayloadSchema = Joi.object()
  .keys(sharedPayloadSchemaKeys)
  .required()

/**
 * Postcode lookup select form payload schema
 * @type {ObjectSchema<PostcodeLookupSelectPayload>}
 */
export const selectPayloadSchema = Joi.object()
  .keys({
    ...sharedPayloadSchemaKeys,
    [uprnFieldName]: Joi.number().required().messages({
      '*': selectLabelText
    })
  })
  .required()

/**
 * Postcode lookup manual form payload schema
 * @type {ObjectSchema<PostcodeLookupManualPayload>}
 */
export const manualPayloadSchema = Joi.object()
  .keys({
    crumb: crumbSchema,
    step: stepSchema,
    [line1FieldName]: Joi.string().required().messages({
      '*': 'Enter address line 1'
    }),
    [line2FieldName]: Joi.string().allow('').required(),
    [townFieldName]: Joi.string().required().messages({
      '*': 'Enter town or city'
    }),
    [countyFieldName]: Joi.string().allow('').required(),
    [postcodeFieldName]: Joi.string().required().messages({
      '*': 'Enter postcode'
    })
  })
  .required()

/**
 * Gets page title
 * @param {Page} page
 * @param {ComponentDef} component
 */
export function getComponentTitle(page, component) {
  if (hasComponentsEvenIfNoNext(page)) {
    const formFields = page.components.filter(hasFormField)

    // When there's more than 1 form component on the page, use the component title
    if (formFields.length > 1 || formFields[0] !== component) {
      return component.title
    }
  }

  // Otherwise use the page title
  return page.title
}

/**
 * Get postcode lookup session key
 * @param {string} slug
 * @param {FormStatus} [state]
 */
export function getKey(slug, state) {
  return `postcode-lookup-${slug}-${state ?? ''}`
}

/**
 * Get the postcode lookup href
 * @param {string} slug - the form slug
 * @param {Page} page - the form page
 * @param {UkAddressFieldComponent} component - the form component
 * @param {FormStatus} [status] - the form status
 * @param {string} [step] - the postcode lookup step
 */
function getHref(slug, page, component, status, step) {
  const query = step ? `?step=${step}` : ''
  const state = status ? `/${status}` : ''

  return `${JOURNEY_BASE_URL}/${slug}${page.path}/${component.name}${state}${query}`
}

/**
 * The postcode lookup details form view model
 * @param {PostcodeLookupDetailsModelData} data
 * @param {PostcodeLookupDetailsPayload} [payload]
 * @param {Error} [err]
 */
export function detailsViewModel(data, payload, err) {
  const { slug, title, page, component, status } = data
  const pageTitle = getComponentTitle(page, component)
  const formPath = constructFormUrl(slug, status)
  const pagePath = constructFormPageUrl(formPath, page.path)

  const backLink = {
    href: pagePath
  }

  const { errors, postcodeQueryError, buildingNameQueryError } =
    buildErrors(err)

  // Model fields
  const fields = getDetailsFields(
    payload,
    postcodeQueryError,
    buildingNameQueryError
  )

  // Model buttons
  const continueButton = {
    text: 'Find address'
  }
  const manualLink = {
    text: 'Enter address manually',
    href: getHref(slug, page, component, status, steps.manual)
  }

  return {
    step: steps.details,
    showTitle: true,
    name: title,
    serviceUrl: formPath,
    pageTitle,
    backLink,
    errors,
    fields,
    buttons: { continueButton, manualLink }
  }
}

/**
 * The postcode lookup select form view model
 * @param {PostcodeLookupSelectModelData} data
 * @param {PostcodeLookupSelectPayload} [payload]
 * @param {Error} [err]
 */
export async function selectViewModel(data, payload, err) {
  const { slug, page, component, details, status, apiKey } = data

  const { postcodeQuery, buildingNameQuery } = details

  // Search for addresses
  const {
    hasAddresses,
    hasMultipleAddresses,
    singleAddress,
    addresses,
    addressCount
  } = await getAddresses(postcodeQuery, buildingNameQuery, apiKey)

  const title = hasAddresses
    ? getComponentTitle(page, component)
    : 'No address found'
  const formPath = constructFormUrl(slug, status)
  const pagePath = constructFormPageUrl(formPath, page.path)

  const backLink = {
    href: pagePath
  }

  const { errors, uprnError } = buildErrors(err)

  // Model fields
  const fields = getSelectViewFields(
    details,
    hasMultipleAddresses,
    singleAddress,
    payload,
    uprnError,
    addresses
  )

  const href = getHref(slug, page, component, status)
  const searchAgainLink = {
    text: 'Search again',
    href
  }

  // Model buttons
  const continueButton = {
    href: !hasAddresses ? href : undefined,
    text: hasAddresses ? 'Use this address' : 'Search again'
  }
  const manualLink = {
    text: 'Enter address manually',
    href: `${href}?step=${steps.manual}`
  }

  return {
    step: steps.select,
    showTitle: true,
    name: title,
    serviceUrl: formPath,
    pageTitle: title,
    backLink,
    errors,
    searchAgainLink,
    fields,
    details,
    addressCount,
    singleAddress,
    hasAddresses,
    hasMultipleAddresses,
    buttons: { continueButton, manualLink }
  }
}

/**
 * The postcode lookup manual form view model
 * @param {PostcodeLookupDetailsModelData} data
 * @param {PostcodeLookupManualPayload} [payload]
 * @param {Error} [err]
 */
export function manualViewModel(data, payload, err) {
  const { slug, title, page, component, status } = data
  const pageTitle = getComponentTitle(page, component)
  const formPath = constructFormUrl(slug, status)
  const pagePath = constructFormPageUrl(formPath, page.path)

  const backLink = {
    href: pagePath
  }

  const {
    errors,
    line1Error,
    line2Error,
    townError,
    countyError,
    postcodeError
  } = buildErrors(err)

  // Model fields
  const fields = getManualFields(
    payload,
    line1Error,
    line2Error,
    townError,
    countyError,
    postcodeError
  )

  // Model buttons
  const continueButton = {
    text: 'Use this address'
  }
  const lookupLink = {
    text: 'Find an address instead',
    href: getHref(slug, page, component, status)
  }

  return {
    step: steps.manual,
    showTitle: true,
    name: title,
    serviceUrl: formPath,
    pageTitle,
    backLink,
    errors,
    fields,
    buttons: { continueButton, lookupLink }
  }
}

/** @typedef { ValidationErrorItem | undefined } OptionalValidationErrorItem */

/**
 * @import { UkAddressFieldComponent, Page, ComponentDef } from '@defra/forms-model'
 * @import { ObjectSchema, ValidationErrorItem } from 'joi'
 * @import { FormStatus } from '~/src/server/routes/types.js'
 * @import { Address, PostcodeLookupDetailsData, PostcodeLookupDetailsModelData, PostcodeLookupDetailsPayload, PostcodeLookupManualPayload, PostcodeLookupSelectModelData, PostcodeLookupSelectPayload } from '~/src/server/plugins/postcode-lookup/types.js'
 */
