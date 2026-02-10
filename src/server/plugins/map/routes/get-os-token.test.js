import { getAccessToken } from '~/src/server/plugins/map/routes/get-os-token.js'
import { post } from '~/src/server/services/httpService.js'

jest.mock('~/src/server/services/httpService.ts')

describe('OS OAuth token', () => {
  describe('getAccessToken', () => {
    it('should get access token', async () => {
      jest.mocked(post).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: {
          access_token: 'access_token',
          expires_in: '299',
          issued_at: '1770036762387',
          token_type: 'Bearer'
        },
        error: undefined
      })

      const token = await getAccessToken({
        ordnanceSurveyApiKey: 'apikey',
        ordnanceSurveyApiSecret: 'apisecret'
      })

      expect(token).toBe('access_token')

      expect(post).toHaveBeenCalledWith('https://api.os.uk/oauth2/token/v1', {
        headers: {
          Authorization: `Basic ${btoa('apikey:apisecret')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        payload: 'grant_type=client_credentials',
        json: true
      })
      expect(post).toHaveBeenCalledTimes(1)
    })

    it('should return an cached token', async () => {
      const token = await getAccessToken({
        ordnanceSurveyApiKey: 'apikey',
        ordnanceSurveyApiSecret: 'apisecret'
      })

      expect(token).toBe('access_token')
      expect(post).toHaveBeenCalledTimes(0)
    })
  })
})

/**
 * @import  { IncomingMessage } from 'node:http'
 */
