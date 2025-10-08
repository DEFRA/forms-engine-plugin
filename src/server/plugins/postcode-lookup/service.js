import { getErrorMessage } from '@defra/forms-model'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getJson } from '~/src/server/services/httpService.js'

const logger = createLogger()

/**
 * OS places search
 * @param {string} query - the search term
 * @param {string} apiKey - the OS api key
 */
export async function searchByQuery(query, apiKey) {
  const getJsonByType =
    /** @type {typeof getJson<DeliveryPointAddressResult>} */ (getJson)

  const url = `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(query)}&key=${apiKey}`

  const response = await getJsonByType(url)

  if (response.error) {
    const error = response.error

    logger.error(
      error,
      `Exception occured calling OS places find ${getErrorMessage(error)}`
    )

    return []
  }

  const results = response.payload.results

  if (!Array.isArray(results)) {
    return []
  }

  return results.map((result) => formatAddress(result.DPA))
}

/**
 * OS postcode search
 * @param {string} postcode - the postcode
 * @param {string} apiKey - the OS api key
 */
export async function searchByPostcode(postcode, apiKey) {
  const getJsonByType =
    /** @type {typeof getJson<DeliveryPointAddressResult>} */ (getJson)

  const url = `https://api.os.uk/search/places/v1/postcode?postcode=${encodeURIComponent(postcode.replace(/\s/g, ''))}&key=${apiKey}`

  const response = await getJsonByType(url)

  if (response.error) {
    const error = response.error

    logger.error(
      error,
      `Exception occured calling OS places postcode ${getErrorMessage(error)}`
    )

    return []
  }

  const results = response.payload.results

  if (!Array.isArray(results)) {
    return []
  }

  return results.map((result) => formatAddress(result.DPA))
}

/**
 * OS UPRN search
 * @param {number} uprn - the unique property reference number
 * @param {string} apiKey - the OS api key
 */
export async function searchByUPRN(uprn, apiKey) {
  const getJsonByType =
    /** @type {typeof getJson<DeliveryPointAddressResult>} */ (getJson)

  const url = `https://api.os.uk/search/places/v1/uprn?uprn=${uprn}&key=${apiKey}`

  const response = await getJsonByType(url)

  if (response.error) {
    const error = response.error

    logger.error(
      error,
      `Exception occured calling OS places UPRN ${getErrorMessage(error)}`
    )

    return []
  }

  const results = response.payload.results

  if (!Array.isArray(results)) {
    return []
  }

  return results.map((result) => formatAddress(result.DPA))
}

/**
 * OS postcode and building name search
 * @param {string} postcodeQuery - the postcode query
 * @param {string} buildingNameQuery - the building name query
 * @param {string} apiKey - the OS api key
 */
export async function search(postcodeQuery, buildingNameQuery, apiKey) {
  let addresses = await searchByPostcode(postcodeQuery, apiKey)

  if (buildingNameQuery) {
    addresses = addresses.filter((item) =>
      item.address.includes(buildingNameQuery.toUpperCase())
    )
  }

  return addresses
}

/**
 * Converts a delivery point address to an address
 * @param {DeliveryPointAddress} dpa
 */
function formatAddress(dpa) {
  const addressLine1 = formatAddressLine1(dpa)
  const addressLine2 = formatAddressLine2(dpa)

  // const lines = [
  //   buildingName,
  //   numberStreet,
  //   dpa.POST_TOWN || '',
  //   dpa.POSTCODE || ''
  // ]

  // const formatted = titleCase(
  //       lines
  //         .filter((i) => i)
  //         .slice(0, -1)
  //         .join(', ')
  //     ) +
  //     ', ' +
  //   (dpa.POSTCODE || '')

  /**
   * @type {Address}
   */
  const address = {
    uprn: dpa.UPRN,
    address: dpa.ADDRESS,
    addressLine1,
    addressLine2,
    town: dpa.POST_TOWN,
    county: '',
    postcode: dpa.POSTCODE
    // formatted
  }

  return address
}

/**
 * @param {DeliveryPointAddress} dpa
 */
function formatAddressLine2(dpa) {
  return dpa.BUILDING_NUMBER || dpa.THOROUGHFARE_NAME
    ? [
        dpa.BUILDING_NUMBER ? dpa.BUILDING_NUMBER.toString() : '',
        dpa.THOROUGHFARE_NAME || ''
      ]
        .filter((item) => !!item)
        .join(' ')
    : ''
}

/**
 * @param {DeliveryPointAddress} dpa
 */
function formatAddressLine1(dpa) {
  return dpa.ORGANISATION_NAME || dpa.SUB_BUILDING_NAME || dpa.BUILDING_NAME
    ? [
        dpa.ORGANISATION_NAME || '',
        dpa.SUB_BUILDING_NAME || '',
        dpa.BUILDING_NAME || ''
      ]
        .filter((item) => !!item)
        .join(' ')
    : ''
}

// /**
//  *
//  * @param {string} address
//  */
// function titleCase(address) {
//   return address
//     .split(' ')
//     .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase())
//     .join(' ')
// }

/**
 * @import { Address, DeliveryPointAddress, DeliveryPointAddressResult } from '~/src/server/plugins/postcode-lookup/types.js'
 */
