/**
 * @typedef {{
 *   ordnanceSurveyApiKey: string
 * }} PostcodeLookupConfiguration
 */

/**
 * @typedef {{
 *   name: string
 *   step?: string
 * }} PostcodeLookupDispatchArgs
 */

/**
 * @typedef {{
 *   sourceUrl: string,
 *   formName: string
 *   componentName: string
 *   componentTitle: string,
 *   componentHint?: string
 *   step?: string,
 *   inputSearchParams: {
 *     postcode: string,
 *     buildingName?: string
 *   }
 * }} PostcodeLookupDispatchData
 */

/**
 * @typedef {{
 *   initial: PostcodeLookupDispatchData
 *   details: PostcodeLookupDetailsData
 * }} PostcodeLookupSessionData
 */

//
// Model types
//

/**
 * The postcode lookup details form view model data
 * @typedef {object} PostcodeLookupDetailsData
 * @property {string} postcodeQuery - postcode query
 * @property {string} buildingNameQuery - Building name or number query
 */

//
// Route types
//

/**
 * Postcode lookup query params
 * @typedef {object} PostcodeLookupQuery
 * @property {string} [step] - step
 */

/**
 * @typedef {object} PostcodeLookupDetailsPayloadProperties
 * @property {string} step - step
 */

/**
 * @typedef {PostcodeLookupDetailsData & PostcodeLookupDetailsPayloadProperties} PostcodeLookupDetailsPayload
 */

/**
 * @typedef {object} PostcodeLookupSelectPayload
 * @property {string} step - step
 * @property {string} uprn - postcode
 */

/**
 * Postcode lookup get request
 * @typedef {object} PostcodeLookupGetRequestRefs
 * @property {PostcodeLookupQuery} Query - Request query
 */

/**
 * Postcode lookup post request
 * @typedef {object} PostcodeLookupPostRequestRefs
 * @property {PostcodeLookupDetailsPayload | PostcodeLookupSelectPayload} Payload - Request payload
 */

/**
 * @typedef {PostcodeLookupGetRequestRefs | PostcodeLookupPostRequestRefs} PostcodeLookupRequestRefs
 * @typedef {Request<PostcodeLookupGetRequestRefs>} PostcodeLookupGetRequest
 * @typedef {Request<PostcodeLookupPostRequestRefs>} PostcodeLookupPostRequest
 * @typedef {PostcodeLookupGetRequest | PostcodeLookupPostRequest} PostcodeLookupRequest
 */

/**
 * @typedef {object} PostcodeLookupManualPayload
 * @property {string} addressLine1 - The address line 1
 * @property {string} addressLine2 - The address line 2
 * @property {string} town - The address town or city
 * @property {string} county - The address county
 * @property {string} postcode - The address postcode
 */

//
// Service types
//

/**
 * @typedef {object} Address
 * @property {string} uprn - The unique property reference
 * @property {string} address - The full address
 * @property {string} addressLine1 - Address line 1
 * @property {string} addressLine2 - Address line 2
 * @property {string} town - Address town
 * @property {string} county - Address county
 * @property {string} postcode - Address postcode
 * @property {string} formatted - The full formatted address
 */

/**
 * OS places address response
 * @typedef {object} DeliveryPointAddress
 * @property {string} UPRN - Unique property reference number
 * @property {string} UDPRN - Unique delivery point Reference Number
 * @property {string} ADDRESS - Address
 * @property {string} ORGANISATION_NAME - Organisation name
 * @property {string} SUB_BUILDING_NAME - Sub building name
 * @property {string} BUILDING_NAME - Building name
 * @property {string} BUILDING_NUMBER - Building number
 * @property {string} THOROUGHFARE_NAME - Throughfare name
 * @property {string} DEPENDENT_LOCALITY - Dependent locality
 * @property {string} POST_TOWN - Post town
 * @property {string} POSTCODE - Postcode
 */

/**
 * OS places DPA response
 * @typedef {object} DeliveryPointAddressItem
 * @property {DeliveryPointAddress} DPA - Delivery point address
 */

/**
 * OS places DPA response
 * @typedef {object} DeliveryPointAddressResult
 * @property {DeliveryPointAddressItem[]} [results] - Delivery point address results
 */

/**
 * @import { Request } from '@hapi/hapi'
 * @import { FormPayload } from '~/src/server/plugins/engine/types.js'
 */
