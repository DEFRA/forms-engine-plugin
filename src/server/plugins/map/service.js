import { getErrorMessage } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { getJson } from '~/src/server/services/httpService.js'

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
  /** @type {{ payload?: { error?: { message?: string } } } | false} */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const boomData = Boom.isBoom(err) && err.data
  const msg = `${getErrorMessage(err)} ${(boomData && boomData.payload?.error?.message) ?? ''}`

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
 * @import { OsNamesFindResponse, OsNamesFindResult } from '~/src/server/plugins/map/types.js'
 */
