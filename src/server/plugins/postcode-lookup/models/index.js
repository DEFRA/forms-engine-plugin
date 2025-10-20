import Joi from 'joi'

import * as service from '~/src/server/plugins/postcode-lookup/service.js'
import { crumbSchema } from '~/src/server/schemas/index.js'

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

const GOVUK_MARGIN_RIGHT_1 = 'govuk-!-margin-right-1'

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
 * Get the details view fields
 * @param {PostcodeLookupDetailsData | undefined} details
 * @param {OptionalValidationErrorItem} postcodeQueryError
 * @param {OptionalValidationErrorItem} buildingNameQueryError
 */
function getDetailsFields(details, postcodeQueryError, buildingNameQueryError) {
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
      value: details?.postcodeQuery,
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
      value: details?.buildingNameQuery,
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
function getSelectFields(
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
        ? [{ text: selectLabelText, value: '' }].concat(
            addresses.map((item) => ({
              text: item.formatted,
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
      classes: 'govuk-!-width-two-thirds',
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
      classes: 'govuk-input--width-10',
      value: payload?.postcode,
      errorMessage: postcodeError && { text: postcodeError.message }
    }
  }
}

export const stepSchema = Joi.string()
  .valid(...Object.keys(steps))
  .required()

const sharedPayloadSchemaKeys = {
  crumb: crumbSchema,
  step: stepSchema
}

/**
 * Postcode lookup details form payload schema
 * @type {ObjectSchema<PostcodeLookupDetailsPayload>}
 */
export const detailsPayloadSchema = Joi.object()
  .keys({
    ...sharedPayloadSchemaKeys,
    [postcodeQueryFieldName]: Joi.string()
      .pattern(/^[a-zA-Z]{1,2}\d[a-zA-Z\d]?\s?\d[a-zA-Z]{2}$/)
      .trim()
      .required()
      .messages({
        'string.pattern.base':
          'Enter a valid postcode or enter an address manually',
        '*': 'Enter a postcode'
      }),
    [buildingNameQueryFieldName]: Joi.string()
      .trim()
      .required()
      .allow('')
      .trim()
  })
  .required()

/**
 * Postcode lookup select form payload schema
 * @type {ObjectSchema<PostcodeLookupSelectPayload>}
 */
export const selectPayloadSchema = Joi.object()
  .keys({
    ...sharedPayloadSchemaKeys,
    [uprnFieldName]: Joi.string().required().messages({
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
    ...sharedPayloadSchemaKeys,
    [line1FieldName]: Joi.string().trim().required().messages({
      '*': 'Enter address line 1'
    }),
    [line2FieldName]: Joi.string().trim().allow('').required(),
    [townFieldName]: Joi.string().trim().required().messages({
      '*': 'Enter town or city'
    }),
    [countyFieldName]: Joi.string().trim().allow('').required(),
    [postcodeFieldName]: Joi.string().trim().required().messages({
      '*': 'Enter postcode'
    })
  })
  .required()

/**
 * Get the postcode lookup href
 * @param {string} [step] - the postcode lookup step
 */
function getHref(step) {
  const query = step ? `?step=${step}` : ''

  return `${JOURNEY_BASE_URL}${query}`
}

/**
 * The postcode lookup details form view model
 * @param {PostcodeLookupSessionData} data
 * @param {PostcodeLookupDetailsData} [payload]
 * @param {Error} [err]
 */
export function detailsViewModel(data, payload, err) {
  const { componentTitle: pageTitle, formName, sourceUrl } = data.initial

  const backLink = {
    href: sourceUrl
  }

  const { errors, postcodeQueryError, buildingNameQueryError } =
    buildErrors(err)

  // Model fields
  const fields = getDetailsFields(
    payload ?? data.details,
    postcodeQueryError,
    buildingNameQueryError
  )

  // Model buttons
  const continueButton = {
    text: 'Find address',
    classes: GOVUK_MARGIN_RIGHT_1
  }
  const manualLink = {
    text: 'enter address manually',
    href: getHref(steps.manual)
  }

  return {
    step: steps.details,
    showTitle: true,
    name: formName,
    serviceUrl: sourceUrl,
    pageTitle,
    backLink,
    errors,
    fields,
    buttons: { continueButton, manualLink }
  }
}

/**
 * The postcode lookup select form view model
 * @param {{ session: PostcodeLookupSessionData, apiKey: string }} data
 * @param {PostcodeLookupSelectPayload} [payload]
 * @param {Error} [err]
 */
export async function selectViewModel(data, payload, err) {
  const { session, apiKey } = data
  const { details, initial } = session
  const { postcodeQuery, buildingNameQuery } = details

  // Search for addresses
  const {
    hasAddresses,
    hasMultipleAddresses,
    singleAddress,
    addresses,
    addressCount
  } = await getAddresses(postcodeQuery, buildingNameQuery, apiKey)

  const title = hasAddresses ? initial.componentTitle : 'No address found'
  const formPath = initial.sourceUrl
  const href = getHref()

  const backLink = { href }

  const { errors, uprnError } = buildErrors(err)

  // Model fields
  const fields = getSelectFields(
    details,
    hasMultipleAddresses,
    singleAddress,
    payload,
    uprnError,
    addresses
  )

  const searchAgainLink = {
    text: 'Search again',
    href
  }

  // Model buttons
  const continueButton = {
    href: hasAddresses ? undefined : href,
    text: hasAddresses ? 'Use this address' : 'Search again',
    classes: GOVUK_MARGIN_RIGHT_1
  }
  const manualLink = {
    text: 'enter address manually',
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
 * @param {PostcodeLookupSessionData} data
 * @param {PostcodeLookupManualPayload} [payload]
 * @param {Error} [err]
 */
export function manualViewModel(data, payload, err) {
  const { componentTitle, sourceUrl, componentHint } = data.initial
  const formPath = sourceUrl
  const href = getHref()

  const backLink = {
    href
  }

  const {
    errors,
    line1Error,
    line2Error,
    townError,
    countyError,
    postcodeError
  } = buildErrors(err)

  // Model hint
  const hint = componentHint && {
    text: componentHint
  }

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
    text: 'Use this address',
    classes: GOVUK_MARGIN_RIGHT_1
  }
  const detailsLink = {
    text: 'find an address instead',
    href
  }

  return {
    step: steps.manual,
    showTitle: true,
    name: componentTitle,
    serviceUrl: formPath,
    pageTitle: componentTitle,
    backLink,
    errors,
    hint,
    fields,
    buttons: { continueButton, detailsLink }
  }
}

/** @typedef { ValidationErrorItem | undefined } OptionalValidationErrorItem */

/**
 * @import { ObjectSchema, ValidationErrorItem } from 'joi'
 * @import { Address, PostcodeLookupDetailsData, PostcodeLookupDetailsPayload, PostcodeLookupManualPayload, PostcodeLookupSelectPayload, PostcodeLookupSessionData } from '~/src/server/plugins/postcode-lookup/types.js'
 */
