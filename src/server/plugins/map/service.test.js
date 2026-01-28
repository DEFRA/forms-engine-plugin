import Boom from '@hapi/boom'

import * as service from '~/src/server/plugins/map/service.js'
import { result as findResult } from '~/src/server/plugins/map/test/__stubs__/find.js'
import { result as nearestResult } from '~/src/server/plugins/map/test/__stubs__/nearest.js'
import { getJson } from '~/src/server/services/httpService.js'

jest.mock('~/src/server/services/httpService.ts')

describe('Maps service', () => {
  describe('find', () => {
    it('should return entires', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: findResult,
        error: undefined
      })

      const { results } = await service.find('NW1 6XE', 'apikey')

      expect(results).toHaveLength(8)
      expect(results.at(1)).toEqual({
        GAZETTEER_ENTRY: {
          ID: 'NW26XE',
          NAMES_URI: 'http://data.ordnancesurvey.co.uk/id/postcodeunit/NW26XE',
          NAME1: 'NW2 6XE',
          TYPE: 'other',
          LOCAL_TYPE: 'Postcode',
          GEOMETRY_X: 523065,
          GEOMETRY_Y: 185795,
          MOST_DETAIL_VIEW_RES: 3500,
          LEAST_DETAIL_VIEW_RES: 18000,
          POPULATED_PLACE: 'London',
          POPULATED_PLACE_URI:
            'http://data.ordnancesurvey.co.uk/id/4000000074813508',
          POPULATED_PLACE_TYPE:
            'http://www.ordnancesurvey.co.uk/xml/codelists/localtype.xml#city',
          DISTRICT_BOROUGH: 'Brent',
          DISTRICT_BOROUGH_URI:
            'http://data.ordnancesurvey.co.uk/id/7000000000011447',
          DISTRICT_BOROUGH_TYPE:
            'http://data.ordnancesurvey.co.uk/ontology/admingeo/LondonBorough',
          COUNTY_UNITARY: 'Greater London',
          COUNTY_UNITARY_URI:
            'http://data.ordnancesurvey.co.uk/id/7000000000041441',
          COUNTY_UNITARY_TYPE:
            'http://data.ordnancesurvey.co.uk/ontology/admingeo/GreaterLondonAuthority',
          REGION: 'London',
          REGION_URI: 'http://data.ordnancesurvey.co.uk/id/7000000000041428',
          COUNTRY: 'England',
          COUNTRY_URI: 'http://data.ordnancesurvey.co.uk/id/country/england'
        }
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

      const { results } = await service.find('NW1 6XE', 'apikey')

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

      const { results } = await service.find('invalid postcode', 'apikey')

      expect(results).toHaveLength(0)
      expect(results).toEqual([])
    })
  })

  describe('nearest', () => {
    it('should return entries', async () => {
      jest.mocked(getJson).mockResolvedValueOnce({
        res: /** @type {IncomingMessage} */ ({
          statusCode: 200,
          headers: {}
        }),
        payload: nearestResult,
        error: undefined
      })

      const { results } = await service.nearest(700000, 1300000, 'apikey')

      expect(results).toHaveLength(1)
      expect(results.at(0)).toEqual({
        GAZETTEER_ENTRY: {
          ID: 'NW26XE',
          NAMES_URI: 'http://data.ordnancesurvey.co.uk/id/postcodeunit/NW26XE',
          NAME1: 'NW2 6XE',
          TYPE: 'other',
          LOCAL_TYPE: 'Postcode',
          GEOMETRY_X: 523065,
          GEOMETRY_Y: 185795,
          MOST_DETAIL_VIEW_RES: 3500,
          LEAST_DETAIL_VIEW_RES: 18000,
          POPULATED_PLACE: 'London',
          POPULATED_PLACE_URI:
            'http://data.ordnancesurvey.co.uk/id/4000000074813508',
          POPULATED_PLACE_TYPE:
            'http://www.ordnancesurvey.co.uk/xml/codelists/localtype.xml#city',
          DISTRICT_BOROUGH: 'Brent',
          DISTRICT_BOROUGH_URI:
            'http://data.ordnancesurvey.co.uk/id/7000000000011447',
          DISTRICT_BOROUGH_TYPE:
            'http://data.ordnancesurvey.co.uk/ontology/admingeo/LondonBorough',
          COUNTY_UNITARY: 'Greater London',
          COUNTY_UNITARY_URI:
            'http://data.ordnancesurvey.co.uk/id/7000000000041441',
          COUNTY_UNITARY_TYPE:
            'http://data.ordnancesurvey.co.uk/ontology/admingeo/GreaterLondonAuthority',
          REGION: 'London',
          REGION_URI: 'http://data.ordnancesurvey.co.uk/id/7000000000041428',
          COUNTRY: 'England',
          COUNTRY_URI: 'http://data.ordnancesurvey.co.uk/id/country/england'
        }
      })
    })
  })
})

/**
 * @import  { IncomingMessage } from 'node:http'
 */
