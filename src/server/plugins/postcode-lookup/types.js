/**
 * @typedef {{
 *   ordnanceSurveyApiKey: string
 *   enginePluginOptions: PluginOptions
 * }} PostcodeLookupConfiguration
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

/**
 * The postcode lookup details form view model data
 * @typedef {object} PostcodeLookupDetailsModelData
 * @property {string} slug - the form slug
 * @property {string} title - the form title
 * @property {Page} page - the form page
 * @property {UkAddressFieldComponent} component - the form component
 * @property {FormStatus} [status] - the form status
 */

/**
 * The postcode lookup select form view model data
 * @typedef {object} PostcodeLookupSelectModelData
 * @property {string} slug - the form slug
 * @property {Page} page - the form page
 * @property {UkAddressFieldComponent} component - the form component
 * @property {PostcodeLookupDetailsData} details - the lookup details
 * @property {string} apiKey - the ordnance survey api key
 * @property {FormStatus} [status] - the form status
 */

/**
 * @typedef {object} PostcodeLookupSessionState
 * @property {PostcodeLookupQuery} query - the source form page query
 * @property {PostcodeLookupDetailsPayload | undefined} details - the current postcode lookup details
 */

//
// Route types
//

/**
 * @typedef {object} PostcodeLookupParams
 * @property {string} slug - the source form slug
 * @property {string} path - the source page path
 * @property {string} componentName - the source component name
 * @property {FormStatus} [state] - the source form status (draft/live) when in preview mode
 */

/**
 * Postcode lookup query params
 * @typedef {object} PostcodeLookupQuery
 * @property {string} [step] - step
 * @property {boolean} [clear] - Clear session state flag
 * @property {boolean} [force] - Force param (preview mode)
 * @property {string} [returnUrl] - Return url (Back to summary page)
 */

/**
 * @typedef {object} PostcodeLookupDetailsPayloadProperties
 * @property {string} step - step
 */

/**
 * @typedef {PostcodeLookupDetailsData & PostcodeLookupDetailsPayloadProperties} PostcodeLookupDetailsPayload
 */

/**
 * @typedef {object} PostcodeLookupSelectPayloadProperties
 * @property {string} step - step
 * @property {number} uprn - postcode
 */

/**
 * @typedef {PostcodeLookupDetailsPayload & PostcodeLookupSelectPayloadProperties} PostcodeLookupSelectPayload
 */

/**
 * Postcode lookup get request
 * @typedef {object} PostcodeLookupGetRequestRefs
 * @property {PostcodeLookupParams} Params - Request parameters
 * @property {PostcodeLookupQuery} Query - Request query
 */

/**
 * Postcode lookup post request
 * @typedef {object} PostcodeLookupPostRequestRefs
 * @property {PostcodeLookupParams} Params - Request parameters
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
 * @property {number} postcode - The address postcode
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
 * @import { UkAddressFieldComponent, Page } from '@defra/forms-model'
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 * @import { FormStatus } from '~/src/server/routes/types.js'
 */
