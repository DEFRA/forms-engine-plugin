/**
 * @typedef {{
 *   ordnanceSurveyApiKey: string
 * }} MapConfiguration
 */

//
// Route types
//

/**
 * Map proxy query params
 * @typedef {object} MapProxyQuery
 * @property {string} url - the proxied url
 */

/**
 * Map geocode query params
 * @typedef {object} MapGeocodeQuery
 * @property {string} query - name query
 */

/**
 * Map reverse geocode query params
 * @typedef {object} MapReverseGeocodeQuery
 * @property {number} easting - the Easting point
 * @property {number} northing - the Northing point
 */

/**
 * Map geocode get request
 * @typedef {object} MapProxyGetRequestRefs
 * @property {MapProxyQuery} Query - Request query
 */

/**
 * Map geocode get request
 * @typedef {object} MapGeocodeGetRequestRefs
 * @property {MapGeocodeQuery} Query - Request query
 */

/**
 * Map reverst geocode get request
 * @typedef {object} MapReverseGeocodeGetRequestRefs
 * @property {MapReverseGeocodeQuery} Query - Request query
 */

/**
 * @typedef {MapProxyGetRequestRefs} MapProxyRequestRefs
 * @typedef {MapGeocodeGetRequestRefs} MapGeocodeRequestRefs
 * @typedef {MapReverseGeocodeGetRequestRefs} MapReverseGeocodeRequestRefs
 * @typedef {Request<MapGeocodeGetRequestRefs>} MapProxyGetRequest
 * @typedef {Request<MapGeocodeGetRequestRefs>} MapGeocodeGetRequest
 * @typedef {Request<MapReverseGeocodeGetRequestRefs>} MapReverseGeocodeGetRequest
 * @typedef {MapProxyGetRequest | MapGeocodeGetRequest | MapReverseGeocodeGetRequest} MapRequest
 */

//
// Service types
//

/**
 * @typedef {object} OsNamesFindResponse
 * @property {OsNamesFindHeader} header - Metadata about the search request and results.
 * @property {OsNamesFindResult[]} results - An array of matched place records from the search.
 */

/**
 * @typedef {object} OsNamesFindHeader
 * @property {string} uri - The query URI (usually same as search text).
 * @property {string} query - The original text query string passed to the API.
 * @property {string} format - The response format returned (e.g., "JSON").
 * @property {number} maxresults - The maximum number of results requested.
 * @property {number} offset - The offset used in the search results.
 * @property {number} totalresults - The total number of results that matched the query.
 */

/**
 * @typedef {object} OsNamesFindGazetteerEntry
 * @property {number} ID - Unique identifier for the place/feature.
 * @property {string} NAMES_URI - A URI (identifier) for this named feature.
 * @property {string} NAME1 - Primary name of the feature.
 * @property {string} TYPE - General type classification of the feature.
 * @property {string} LOCAL_TYPE - Local or more specific type classification.
 * @property {number} GEOMETRY_X - Easting coordinate (British National Grid).
 * @property {number} GEOMETRY_Y - Northing coordinate (British National Grid).
 * @property {number} MOST_DETAIL_VIEW_RES - Most detailed resolution available.
 * @property {number} LEAST_DETAIL_VIEW_RES - Least detailed resolution available.
 * @property {number} MBR_XMIN - Minimum bounding box X (easting).
 * @property {number} MBR_YMIN - Minimum bounding box Y (northing).
 * @property {number} MBR_XMAX - Maximum bounding box X (easting).
 * @property {number} MBR_YMAX - Maximum bounding box Y (northing).
 * @property {string} [POSTCODE_DISTRICT] - (Optional) Postcode district.
 * @property {string} [POSTCODE_DISTRICT_URI] - (Optional) URI for the postcode district.
 * @property {string} [POPULATED_PLACE] - (Optional) Name of associated populated place.
 * @property {string} [POPULATED_PLACE_URI] - (Optional) URI of populated place.
 * @property {string} [POPULATED_PLACE_TYPE] - (Optional) Type of populated place.
 * @property {string} [COUNTY_UNITARY] - (Optional) County or unitary authority name.
 * @property {string} [COUNTY_UNITARY_URI] - (Optional) URI for county/unitary authority.
 * @property {string} [COUNTY_UNITARY_TYPE] - (Optional) Classification of county/unitary authority.
 * @property {string} [REGION] - (Optional) Region name.
 * @property {string} [REGION_URI] - (Optional) URI for region.
 * @property {string} [COUNTRY] - (Optional) Country name.
 * @property {string} [COUNTRY_URI] - (Optional) URI for country.
 */

/**
 * OS names GAZETTEER_ENTRY response
 * @typedef {object} OsNamesFindResult
 * @property {OsNamesFindGazetteerEntry} GAZETTEER_ENTRY - Gazetteer entry
 */

/**
 * @import { Request } from '@hapi/hapi'
 */
