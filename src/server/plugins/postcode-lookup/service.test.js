import Boom from '@hapi/boom'

import * as service from '~/src/server/plugins/postcode-lookup/service.js'
import { result as postcodeResult } from '~/src/server/plugins/postcode-lookup/test/__stubs__/postcode.js'
import { result as queryResult } from '~/src/server/plugins/postcode-lookup/test/__stubs__/query.js'
import { result as uprnResult } from '~/src/server/plugins/postcode-lookup/test/__stubs__/uprn.js'
import { getJson } from '~/src/server/services/httpService.js'

jest.mock('~/src/server/services/httpService.ts')

describe('Postcode lookup service', () => {
  describe('searchByPostcode', () => {
    it('should return formatted addresses', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: postcodeResult,
        error: undefined
      })

      const results = await service.searchByPostcode('cw8 2at', 'apikey')

      expect(results).toHaveLength(10)
      expect(results.at(0)).toEqual({
        address: 'FOREST DENE, FOREST HILL, HARTFORD, NORTHWICH, CW8 2AT',
        addressLine1: 'Forest Dene',
        addressLine2: 'Forest Hill, Hartford',
        county: '',
        formatted: 'Forest Dene, Forest Hill, Hartford, Northwich, CW8 2AT',
        postcode: 'CW8 2AT',
        town: 'Northwich',
        uprn: '200003232010'
      })
    })

    it('should return an empty response when an error is encountered', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 300,
          headers: {}
        }),
        payload: undefined,
        error: new Error('Unknown error')
      })

      const results = await service.searchByPostcode('cw8 2at', 'apikey')

      expect(results).toHaveLength(0)
      expect(results).toEqual([])
    })

    it('should return an empty response when a non 200 response is encountered', async () => {
      jest
        .mocked(getJson)
        .mockRejectedValueOnce(
          Boom.badRequest(
            'OS API error',
            new Error('Invalid postcode segments')
          )
        )

      const results = await service.searchByPostcode(
        'invalid postcode',
        'apikey'
      )

      expect(results).toHaveLength(0)
      expect(results).toEqual([])
    })

    it('should return an empty response when no results are returned', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: { results: undefined },
        error: undefined
      })

      const results = await service.searchByPostcode('cw8 2at', 'apikey')

      expect(results).toHaveLength(0)
      expect(results).toEqual([])
    })
  })

  describe('searchByUPRN', () => {
    it('should return formatted addresses', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: uprnResult,
        error: undefined
      })

      const results = await service.searchByUPRN('200003232010', 'apikey')

      expect(results).toHaveLength(1)
      expect(results.at(0)).toEqual({
        address: 'FOREST DENE, FOREST HILL, HARTFORD, NORTHWICH, CW8 2AT',
        addressLine1: 'Forest Dene',
        addressLine2: 'Forest Hill, Hartford',
        county: '',
        formatted: 'Forest Dene, Forest Hill, Hartford, Northwich, CW8 2AT',
        postcode: 'CW8 2AT',
        town: 'Northwich',
        uprn: '200003232010'
      })
    })
  })

  describe('searchByQuery', () => {
    it('should return formatted addresses', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: queryResult,
        error: undefined
      })

      const results = await service.searchByQuery(
        'forest dene northwich',
        'apikey'
      )

      expect(results).toHaveLength(5)
      expect(results.at(0)).toEqual({
        address: 'FOREST DENE, FOREST HILL, HARTFORD, NORTHWICH, CW8 2AT',
        addressLine1: 'Forest Dene',
        addressLine2: 'Forest Hill, Hartford',
        county: '',
        formatted: 'Forest Dene, Forest Hill, Hartford, Northwich, CW8 2AT',
        postcode: 'CW8 2AT',
        town: 'Northwich',
        uprn: '200003232010'
      })
    })
  })

  describe('search', () => {
    it('should return formatted addresses', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: postcodeResult,
        error: undefined
      })

      const results = await service.search('cw8 2at', 'Dene', 'apikey')

      expect(results).toHaveLength(1)
      expect(results.at(0)).toEqual({
        address: 'FOREST DENE, FOREST HILL, HARTFORD, NORTHWICH, CW8 2AT',
        addressLine1: 'Forest Dene',
        addressLine2: 'Forest Hill, Hartford',
        county: '',
        formatted: 'Forest Dene, Forest Hill, Hartford, Northwich, CW8 2AT',
        postcode: 'CW8 2AT',
        town: 'Northwich',
        uprn: '200003232010'
      })
    })
  })
})

/**
 * @import  { IncomingMessage } from 'node:http'
 */
