import { ComponentType, hasComponentsEvenIfNoNext } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { FORM_PREFIX } from '~/src/server/constants.js'
import {
  checkFormStatus,
  getCacheService
} from '~/src/server/plugins/engine/helpers.js'
import {
  JOURNEY_BASE_URL,
  detailsPayloadSchema,
  detailsViewModel,
  getKey,
  manualPayloadSchema,
  manualViewModel,
  paramsSchema,
  selectPayloadSchema,
  selectViewModel,
  stepSchema,
  steps
} from '~/src/server/plugins/postcode-lookup/models/index.js'
import * as service from '~/src/server/plugins/postcode-lookup/service.js'

const viewName = 'postcode-lookup-details'

/**
 * Get the details of the source form elements associated with this journey
 * @param {PostcodeLookupRequest} request
 */
function getJourneyDetails(request) {
  const { app, params } = request
  const { model } = app
  const { path, componentName } = params

  if (!model) {
    throw Boom.notFound(`No model found for ${path}`)
  }

  const { isPreview, state: status } = checkFormStatus(params)
  const title = model.name
  const page = model.pageDefMap.get(`/${path}`)

  if (!page) {
    throw Boom.notFound(`No page found for ${path}`)
  }

  const component = hasComponentsEvenIfNoNext(page)
    ? page.components.find((c) => c.name === componentName)
    : undefined

  if (!component) {
    throw Boom.notFound(`No component found for name ${componentName}`)
  }

  if (component.type !== ComponentType.UkAddressField) {
    throw Boom.internal(
      `Invalid component type, expected UkAddressFieldComponent got ${component.type}`
    )
  }

  return { model, title, page, component, isPreview, status }
}

/**
 * Update form component state
 * @param {PostcodeLookupRequest} request - the request
 * @param {string} componentName - the component name
 * @param {Address | PostcodeLookupManualPayload} address - the address from ordnance survey or manually entered
 */
async function updateComponentState(request, componentName, address) {
  // TODO: Set state another way
  const addressState = {
    [`${componentName}__addressLine1`]: address.addressLine1,
    [`${componentName}__addressLine2`]: address.addressLine2,
    [`${componentName}__town`]: address.town,
    [`${componentName}__county`]: address.county,
    [`${componentName}__postcode`]: address.postcode
  }

  const cacheService = getCacheService(request.server)
  // @ts-expect-error - Request typing
  const state = await cacheService.getState(request)
  // @ts-expect-error - Request typing
  await cacheService.setState(request, {
    ...state,
    ...addressState
  })
}

/**
 * Gets the postcode lookup routes
 * @param {RouteOptions<PostcodeLookupRequestRefs>} getRouteOptions
 * @param {string} apiKey
 */
export function getRoutes(getRouteOptions, apiKey) {
  /**
   * Post handler for the details step
   * @param {PostcodeLookupPostRequest} request
   * @param {ResponseToolkit<PostcodeLookupPostRequestRefs>} h
   */
  async function detailsPostHandler(request, h) {
    const { params, payload } = request
    const { slug, state: status } = params
    const { title, page, component } = getJourneyDetails(request)

    const { value: details, error } = detailsPayloadSchema.validate(payload)

    let data, model

    if (error) {
      data = { slug, title, page, component, status }
      model = detailsViewModel(data, details, error)

      return h.view(viewName, model)
    }

    // Store the details in session
    request.yar.set(getKey(slug, status), details)

    data = { slug, page, component, details, status, apiKey }
    model = await selectViewModel(data)

    return h.view(viewName, model)
  }

  /**
   * Post handler for the select step
   * @param {PostcodeLookupPostRequest} request
   * @param {ResponseToolkit<PostcodeLookupPostRequestRefs>} h
   */
  async function selectPostHandler(request, h) {
    const { params, payload } = request
    const { slug, path, componentName, state: status } = params
    const { page, component } = getJourneyDetails(request)

    const { value: select, error } = selectPayloadSchema.validate(payload)

    if (error) {
      const { postcodeQuery, buildingNameQuery } = select
      const details = { postcodeQuery, buildingNameQuery }
      const data = { slug, page, component, details, status, apiKey }
      const model = await selectViewModel(data, select, error)

      return h.view(viewName, model)
    }

    const addresses = await service.searchByUPRN(select.uprn, apiKey)
    const property = addresses.at(0)

    if (!property) {
      throw Boom.internal(`UPRN ${property} not found`)
    }

    await updateComponentState(request, componentName, property)

    // Redirect back to the source form page
    return h
      .redirect(`${FORM_PREFIX}/${slug}/${path}`)
      .code(StatusCodes.SEE_OTHER)
  }

  /**
   * Post handler for the manual step
   * @param {PostcodeLookupPostRequest} request
   * @param {ResponseToolkit<PostcodeLookupPostRequestRefs>} h
   */
  async function manualPostHandler(request, h) {
    const { params, payload } = request
    const { slug, path, componentName, state: status } = params
    const { title, page, component } = getJourneyDetails(request)

    const { value: manual, error } = manualPayloadSchema.validate(payload, {
      abortEarly: false
    })

    if (error) {
      const data = { slug, title, page, component, status }
      const model = manualViewModel(data, manual, error)

      return h.view(viewName, model)
    }

    await updateComponentState(request, componentName, manual)

    // Redirect back to the source form page
    return h
      .redirect(`${FORM_PREFIX}/${slug}/${path}`)
      .code(StatusCodes.SEE_OTHER)
  }

  return [
    /**
     * @satisfies {ServerRoute<PostcodeLookupGetRequestRefs>}
     */
    ({
      method: 'GET',
      path: `${JOURNEY_BASE_URL}/{slug}/{path}/{componentName}/{state?}`,
      handler(request, h) {
        const { params, query } = request
        const { slug, state: status } = params
        const { title, page, component } = getJourneyDetails(request)

        // Get the previous details from session
        const previous = request.yar.get(getKey(slug, status))

        const data = { slug, page, title, component, status }
        const model =
          query.step === steps.manual
            ? manualViewModel(data)
            : detailsViewModel(data, previous)

        return h.view(viewName, model)
      },
      // @ts-expect-error - Request typing
      options: {
        ...getRouteOptions,
        validate: {
          params: paramsSchema,
          query: Joi.object()
            .keys({
              step: Joi.string().allow(steps.details, steps.manual).optional()
            })
            .optional()
        }
      }
    }),
    /**
     * @satisfies {ServerRoute<PostcodeLookupPostRequestRefs>}
     */
    ({
      method: 'POST',
      path: `${JOURNEY_BASE_URL}/{slug}/{path}/{componentName}/{state?}`,
      async handler(request, h) {
        const { payload } = request
        const { step } = payload

        switch (step) {
          case steps.details: {
            return detailsPostHandler(request, h)
          }
          case steps.select: {
            return selectPostHandler(request, h)
          }
          case steps.manual: {
            return manualPostHandler(request, h)
          }
          default:
            throw Boom.badRequest(`Invalid step ${step}`)
        }
      },
      // @ts-expect-error - Request typing
      options: {
        ...getRouteOptions,
        validate: {
          params: paramsSchema,
          payload: Joi.object()
            .keys({
              step: stepSchema
            })
            .unknown(true)
        }
      }
    })
  ]
}

/**
 * @import { ResponseToolkit, RouteOptions, ServerRoute } from '@hapi/hapi'
 * @import { PostcodeLookupManualPayload, Address, PostcodeLookupGetRequestRefs, PostcodeLookupPostRequestRefs, PostcodeLookupRequest, PostcodeLookupRequestRefs, PostcodeLookupPostRequest } from '~/src/server/plugins/postcode-lookup/types.js'
 */
