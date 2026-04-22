import { post } from '~/src/server/services/httpService.js'

/**
 * @type {string}
 */
let cachedToken
let tokenExpiry = 0

/**
 * Get Ordnance Survey OAuth token
 * @param {MapConfiguration} options - Ordnance survey map options
 */
export async function getAccessToken(options) {
  const { ordnanceSurveyApiKey: key, ordnanceSurveyApiSecret: secret } = options
  const now = Date.now()

  if (cachedToken && now < tokenExpiry) {
    return cachedToken
  }

  const creds = `${key}:${secret}`
  const postByType = /** @type {typeof post<OsTokenResponse>} */ (post)

  const result = await postByType('https://api.os.uk/oauth2/token/v1', {
    headers: {
      Authorization: `Basic ${btoa(creds)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: 'grant_type=client_credentials',
    json: true
  })

  const data = result.payload

  if (!data) {
    throw new Error('Failed to obtain OS API token')
  }

  cachedToken = data.access_token
  tokenExpiry = now + (data.expires_in - 60) * 1000 // refresh early

  return cachedToken
}

/**
 * @typedef {object} OsTokenResponse
 * @property {string} access_token - The access token
 * @property {number} expires_in - The expiry in seconds
 */

/**
 * @import { MapConfiguration } from '~/src/server/plugins/map/types.js'
 */
