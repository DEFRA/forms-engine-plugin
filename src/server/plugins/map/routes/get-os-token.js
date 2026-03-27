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
  const result = await post('https://api.os.uk/oauth2/token/v1', {
    headers: {
      Authorization: `Basic ${btoa(creds)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: 'grant_type=client_credentials',
    json: true
  })

  const data = result.payload

  cachedToken = data.access_token
  tokenExpiry = now + (data.expires_in - 60) * 1000 // refresh early

  return cachedToken
}

/**
 * @import { MapConfiguration } from '~/src/server/plugins/map/types.js'
 */
