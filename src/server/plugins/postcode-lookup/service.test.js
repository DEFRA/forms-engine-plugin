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

      const results = await service.searchByPostcode('NW1 6XE', 'apikey')

      expect(results).toHaveLength(10)
      expect(results.at(0)).toEqual({
        address: "EMILIA'S CRAFTED PASTA, 215, BAKER STREET, LONDON, NW1 6XE",
        addressLine1: "Emilia's Crafted Pasta 215",
        addressLine2: 'Baker Street',
        county: '',
        formatted: "Emilia's Crafted Pasta 215, Baker Street, London, NW1 6XE",
        postcode: 'NW1 6XE',
        town: 'London',
        uprn: '10033619968'
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

      const results = await service.searchByPostcode('NW1 6XE', 'apikey')

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

      const results = await service.searchByPostcode('NW1 6XE', 'apikey')

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

      const results = await service.searchByUPRN('100023071949', 'apikey')

      expect(results).toHaveLength(1)
      expect(results.at(0)).toEqual({
        address: 'SHERLOCK HOLMES MUSEUM, 221B, BAKER STREET, LONDON, NW1 6XE',
        addressLine1: 'Sherlock Holmes Museum 221b',
        addressLine2: 'Baker Street',
        county: '',
        formatted: 'Sherlock Holmes Museum 221b, Baker Street, London, NW1 6XE',
        postcode: 'NW1 6XE',
        town: 'London',
        uprn: '100023071949'
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
        'Prime minister downing',
        'apikey'
      )

      expect(results).toHaveLength(5)
      expect(results.at(0)).toEqual({
        address: 'BAKER STREET COTTAGE, BAKER STREET, FROME, BA11 3BL',
        addressLine1: 'Baker Street Cottage',
        addressLine2: 'Baker Street',
        town: 'Frome',
        county: '',
        formatted: 'Baker Street Cottage, Baker Street, Frome, BA11 3BL',
        postcode: 'BA11 3BL',
        uprn: '250034655'
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

      const results = await service.search('NW1 6XE', 'Emilia', 'apikey')

      expect(results).toHaveLength(1)
      expect(results.at(0)).toEqual({
        address: "EMILIA'S CRAFTED PASTA, 215, BAKER STREET, LONDON, NW1 6XE",
        addressLine1: "Emilia's Crafted Pasta 215",
        addressLine2: 'Baker Street',
        county: '',
        formatted: "Emilia's Crafted Pasta 215, Baker Street, London, NW1 6XE",
        postcode: 'NW1 6XE',
        town: 'London',
        uprn: '10033619968'
      })
    })
  })
})

/**
 * @import  { IncomingMessage } from 'node:http'
 */
