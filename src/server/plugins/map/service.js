import { getErrorMessage } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getJson } from '~/src/server/services/httpService.js'

const logger = createLogger()

/**
 * Returns an empty result set
 */
function empty() {
  /** @type {OsNamesFindResult[]} */
  const results = []

  return /** @type {OsNamesFindResponse} */ ({ header: {}, results })
}

/**
 * Logs OS names errors
 * @param {unknown} err - the error
 * @param {string} endpoint - the OS api endpoint
 */
function logErrorAndReturnEmpty(err, endpoint) {
  const msg = `${getErrorMessage(err)} ${(Boom.isBoom(err) && err.data?.payload?.error?.message) ?? ''}`

  logger.error(err, `Exception occured calling OS names ${endpoint} - ${msg}}`)

  return empty()
}

/**
 * Fetch data from OS names API
 * @param {string} url - the url to get address json data from
 * @param {string} endpoint - the url endpoint description for logging
 */
async function getData(url, endpoint) {
  const getJsonByType = /** @type {typeof getJson<OsNamesFindResponse>} */ (
    getJson
  )

  try {
    const response = await getJsonByType(url)

    if (response.error) {
      return logErrorAndReturnEmpty(response.error, endpoint)
    }

    const results = response.payload

    return results
  } catch (err) {
    return logErrorAndReturnEmpty(err, endpoint)
  }
}

/**
 * OS names search find by query
 * @param {string} query - the search term
 * @param {string} apiKey - the OS api key
 */
export async function find(query, apiKey) {
  const endpoint = 'find'
  const url = `https://api.os.uk/search/names/v1/find?key=${apiKey}&query=${query}&fq=local_type:postcode%20local_type:hamlet%20local_type:village%20local_type:town%20local_type:city%20local_type:other_settlement&maxresults=8`

  return getData(url, endpoint)
}

/**
 * OS names search nearest by E/N
 * @param {number} easting - the easting
 * @param {number} northing - the northing
 * @param {string} apiKey - the OS api key
 */
export async function nearest(easting, northing, apiKey) {
  const endpoint = 'nearest'
  const url = `https://api.os.uk/search/names/v1/nearest?key=${apiKey}&point=${easting},${northing}&radius=1000&fq=local_type:Airfield%20local_type:Airport%20local_type:Bus_Station%20local_type:Chemical_Works%20local_type:City%20local_type:Coach_Station%20local_type:Electricity_Distribution%20local_type:Electricity_Production%20local_type:Further_Education%20local_type:Gas_Distribution_or_Storage%20local_type:Hamlet%20local_type:Harbour%20local_type:Helicopter_Station%20local_type:Heliport%20local_type:Higher_or_University_Education%20local_type:Hill_Or_Mountain%20local_type:Hospice%20local_type:Hospital%20local_type:Medical_Care_Accommodation%20local_type:Named_Road%20local_type:Non_State_Primary_Education%20local_type:Non_State_Secondary_Education%20local_type:Other_Settlement%20local_type:Passenger_Ferry_Terminal%20local_type:Port_Consisting_of_Docks_and_Nautical_Berthing%20local_type:Postcode%20local_type:Primary_Education%20local_type:Railway_Station%20local_type:Road_User_Services%20local_type:Secondary_Education%20local_type:Section_Of_Named_Road%20local_type:Section_Of_Numbered_Road%20local_type:Special_Needs_Education%20local_type:Suburban_Area%20local_type:Town%20local_type:Urban_Greenspace%20local_type:Vehicular_Ferry_Terminal%20local_type:Vehicular_Rail_Terminal%20local_type:Village%20local_type:Waterfall%20`

  return getData(url, endpoint)
}

/**
 * @import { OsNamesFindResponse, OsNamesFindResult } from '~/src/server/plugins/map/types.js'
 */
