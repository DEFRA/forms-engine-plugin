import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { EXTERNAL_STATE_APPENDAGE } from '~/src/server/constants.js'
import {
  JOURNEY_BASE_URL,
  detailsPayloadSchema,
  detailsViewModel,
  manualPayloadSchema,
  manualViewModel,
  selectPayloadSchema,
  selectViewModel,
  stepSchema,
  steps
} from '~/src/server/plugins/postcode-lookup/models/index.js'
import * as service from '~/src/server/plugins/postcode-lookup/service.js'

const viewName = 'postcode-lookup-details'

/**
 * Get the session state associated with this journey
 * @param {PostcodeLookupRequest} request
 */
function getSessionState(request) {
  /**
   * @type {PostcodeLookupSessionData | undefined}
   */
  const state = request.yar.get(JOURNEY_BASE_URL)

  if (!state) {
    throw Boom.internal(`No postcode lookup data found for ${JOURNEY_BASE_URL}`)
  }

  return state
}

/**
 * Flash form component state
 * @param {PostcodeLookupRequest} request - the request
 * @param {string} componentName - the component name
 * @param {Address | PostcodeLookupManualPayload} address - the address from ordnance survey or manually entered
 */
function flashComponentState(request, componentName, address) {
  const addressState = {
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    town: address.town,
    county: address.county,
    postcode: address.postcode,
    uprn: 'uprn' in address && address.uprn ? address.uprn : undefined
  }

  /**
   * @type {ExternalStateAppendage}
   */
  const appendage = {
    component: componentName,
    data: addressState
  }

  request.yar.flash(EXTERNAL_STATE_APPENDAGE, appendage, true)
}

/**
 * Initialises and dispatches the request to the postcode lookup journey
 * @param {FormRequestPayload} request - the source page
 * @param {FormResponseToolkit} h - the source page
 * @param {PostcodeLookupDispatchData} initial - the source data
 */
export function dispatch(request, h, initial) {
  /**
   * @type {PostcodeLookupSessionData}
   */
  const data = {
    initial,
    details: { postcodeQuery: '', buildingNameQuery: '' }
  }

  request.yar.set(JOURNEY_BASE_URL, data)

  const query = initial.step ? `?step=${initial.step}` : ''

  return h.redirect(`${JOURNEY_BASE_URL}${query}`).code(StatusCodes.SEE_OTHER)
}

/**
 * Gets the postcode lookup routes
 * @param {PostcodeLookupConfiguration} options - ordnance survey api key
 */
export function getRoutes(options) {
  return [getRoute(), postRoute(options)]
}

/**
 * @returns {ServerRoute<PostcodeLookupGetRequestRefs>}
 */
function getRoute() {
  return {
    method: 'GET',
    path: JOURNEY_BASE_URL,
    handler(request, h) {
      const { query } = request
      const { step } = query
      const session = getSessionState(request)

      const model =
        step === steps.manual
          ? manualViewModel(session)
          : detailsViewModel(session)

      return h.view(viewName, model)
    },
    options: {
      validate: {
        query: Joi.object()
          .keys({
            step: Joi.string().allow(steps.details, steps.manual).optional()
          })
          .optional()
      }
    }
  }
}

/**
 * @param {PostcodeLookupConfiguration} options
 * @returns {ServerRoute<PostcodeLookupPostRequestRefs>}
 */
function postRoute(options) {
  return {
    method: 'POST',
    path: JOURNEY_BASE_URL,
    async handler(request, h) {
      const { payload } = request
      const { step } = payload

      switch (step) {
        case steps.details: {
          return detailsPostHandler(request, h, options)
        }
        case steps.select: {
          return selectPostHandler(request, h, options)
        }
        case steps.manual: {
          return manualPostHandler(request, h)
        }
        default:
          throw Boom.badRequest(`Invalid step ${step}`)
      }
    },
    options: {
      validate: {
        payload: Joi.object()
          .keys({
            step: stepSchema
          })
          .unknown(true)
      }
    }
  }
}

/**
 * Post handler for the details step
 * @param {PostcodeLookupPostRequest} request
 * @param {ResponseToolkit<PostcodeLookupPostRequestRefs>} h
 * @param {PostcodeLookupConfiguration} options
 */
async function detailsPostHandler(request, h, options) {
  const { payload } = request
  const session = getSessionState(request)
  const { ordnanceSurveyApiKey: apiKey } = options
  const { value: details, error } = detailsPayloadSchema.validate(payload)

  let model

  if (error) {
    model = detailsViewModel(session, details, error)

    return h.view(viewName, model)
  }

  const { postcodeQuery, buildingNameQuery } = details
  session.details = { postcodeQuery, buildingNameQuery }

  // Store the updated session
  request.yar.set(JOURNEY_BASE_URL, session)

  model = await selectViewModel({ session, apiKey })

  return h.view(viewName, model)
}

/**
 * Post handler for the select step
 * @param {PostcodeLookupPostRequest} request
 * @param {ResponseToolkit<PostcodeLookupPostRequestRefs>} h
 * @param {PostcodeLookupConfiguration} options
 */
async function selectPostHandler(request, h, options) {
  const { payload } = request
  const session = getSessionState(request)
  const { ordnanceSurveyApiKey: apiKey } = options
  const { value: select, error } = selectPayloadSchema.validate(payload)

  if (error) {
    const model = await selectViewModel({ session, apiKey }, select, error)

    return h.view(viewName, model)
  }

  const addresses = await service.searchByUPRN(select.uprn, apiKey)
  const property = addresses.at(0)

  if (!property) {
    throw Boom.internal(`UPRN ${property} not found`)
  }

  const { componentName, sourceUrl } = session.initial
  flashComponentState(request, componentName, property)

  // Redirect back to the source form page
  return h.redirect(sourceUrl).code(StatusCodes.SEE_OTHER)
}

/**
 * Post handler for the manual step
 * @param {PostcodeLookupPostRequest} request
 * @param {ResponseToolkit<PostcodeLookupPostRequestRefs>} h
 */
function manualPostHandler(request, h) {
  const { payload } = request
  const session = getSessionState(request)

  const { value: manual, error } = manualPayloadSchema.validate(payload, {
    abortEarly: false
  })

  if (error) {
    const model = manualViewModel(session, manual, error)

    return h.view(viewName, model)
  }

  const { componentName, sourceUrl } = session.initial
  flashComponentState(request, componentName, manual)

  // Redirect back to the source form page
  return h.redirect(sourceUrl).code(StatusCodes.SEE_OTHER)
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { PostcodeLookupManualPayload, Address, PostcodeLookupGetRequestRefs, PostcodeLookupPostRequestRefs, PostcodeLookupRequest, PostcodeLookupPostRequest, PostcodeLookupConfiguration, PostcodeLookupDispatchData, PostcodeLookupSessionData } from '~/src/server/plugins/postcode-lookup/types.js'
 * @import { FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 * @import { ExternalStateAppendage } from '~/src/server/plugins/engine/types.js'
 */
