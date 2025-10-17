import { getErrorMessage } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getJson } from '~/src/server/services/httpService.js'

const logger = createLogger()

/**
 * Returns an empty result set
 */
function empty() {
  return []
}

/**
 * Logs OS places errors
 * @param {unknown} err - the error
 * @param {string} endpoint - the OS api endpoint
 */
function logErrorAndReturnEmpty(err, endpoint) {
  const msg = `${getErrorMessage(err)} ${(Boom.isBoom(err) && err.data?.payload?.error?.message) ?? ''}`

  logger.error(err, `Exception occured calling OS places ${endpoint} - ${msg}}`)

  return empty()
}

/**
 * Fetch data from OS API
 * @param {string} url - the url to get address json data from
 * @param {string} endpoint - the url endpoint description for logging
 */
async function getAddressData(url, endpoint) {
  const getJsonByType =
    /** @type {typeof getJson<DeliveryPointAddressResult>} */ (getJson)

  try {
    const response = await getJsonByType(url)

    if (response.error) {
      return logErrorAndReturnEmpty(response.error, endpoint)
    }

    const results = response.payload.results

    if (!Array.isArray(results)) {
      return empty()
    }

    return results.map((result) => formatAddress(result.DPA))
  } catch (err) {
    return logErrorAndReturnEmpty(err, endpoint)
  }
}

/**
 * OS places search
 * @param {string} query - the search term
 * @param {string} apiKey - the OS api key
 */
export async function searchByQuery(query, apiKey) {
  const endpoint = 'find'
  const url = `https://api.os.uk/search/places/v1/${endpoint}?query=${encodeURIComponent(query)}&key=${apiKey}`

  return getAddressData(url, endpoint)
}

/**
 * OS postcode search
 * @param {string} postcode - the postcode
 * @param {string} apiKey - the OS api key
 */
export async function searchByPostcode(postcode, apiKey) {
  const endpoint = 'postcode'
  const url = `https://api.os.uk/search/places/v1/${endpoint}?postcode=${encodeURIComponent(postcode.replaceAll(/\s/g, ''))}&key=${apiKey}`

  return getAddressData(url, endpoint)
}

/**
 * OS UPRN search
 * @param {string} uprn - the unique property reference number
 * @param {string} apiKey - the OS api key
 */
export async function searchByUPRN(uprn, apiKey) {
  const endpoint = 'uprn'
  const url = `https://api.os.uk/search/places/v1/${endpoint}?uprn=${uprn}&key=${apiKey}`

  return getAddressData(url, endpoint)
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
 * Taken from http://github.com/dwp/find-an-address-plugin/blob/main/utils/getData.js
 * @param {DeliveryPointAddress} dpa
 */
function formatAddress(dpa) {
  const addressLine1 = formatAddressLine1(dpa)
  const addressLine2 = formatAddressLine2(dpa)
  const town = titleCase(dpa.POST_TOWN || '')
  const postcode = dpa.POSTCODE || ''
  const lines = [addressLine1, addressLine2, town]
  const formatted = `${lines.filter((i) => !!i).join(', ')}, ${postcode}`

  /**
   * @type {Address}
   */
  const address = {
    uprn: dpa.UPRN,
    address: dpa.ADDRESS,
    addressLine1,
    addressLine2,
    town,
    county: '',
    postcode,
    formatted
  }

  return address
}

/**
 * @param {DeliveryPointAddress} dpa
 */
function formatAddressLine1(dpa) {
  return titleCase(
    dpa.ORGANISATION_NAME ||
      dpa.SUB_BUILDING_NAME ||
      dpa.BUILDING_NAME ||
      dpa.BUILDING_NUMBER
      ? [
          dpa.ORGANISATION_NAME || '',
          dpa.SUB_BUILDING_NAME || '',
          dpa.BUILDING_NAME || '',
          dpa.BUILDING_NUMBER || ''
        ]
          .filter((item) => !!item)
          .join(' ')
      : ''
  )
}

/**
 * @param {DeliveryPointAddress} dpa
 */
function formatAddressLine2(dpa) {
  return titleCase(
    dpa.THOROUGHFARE_NAME || dpa.DEPENDENT_LOCALITY
      ? [dpa.THOROUGHFARE_NAME || '', dpa.DEPENDENT_LOCALITY || '']
          .filter((item) => !!item)
          .join(', ')
      : ''
  )
}

/**
 * Title case address
 * @param {string} address
 */
function titleCase(address) {
  return address
    .split(' ')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase())
    .join(' ')
}

/**
 * @import { Address, DeliveryPointAddress, DeliveryPointAddressResult } from '~/src/server/plugins/postcode-lookup/types.js'
 */
