import { resolve } from 'node:path'

import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { getAccessToken } from '~/src/server/plugins/map/routes/get-os-token.js'
import { find, nearest } from '~/src/server/plugins/map/service.js'
import {
  get,
  request as httpRequest
} from '~/src/server/services/httpService.js'

/**
 * Gets the map support routes
 * @param {MapConfiguration} options - ordnance survey names api key
 */
export function getRoutes(options) {
  return [
    mapStyleResourceRoutes(),
    mapProxyRoute(options),
    tileProxyRoute(options),
    geocodeProxyRoute(options),
    reverseGeocodeProxyRoute(options)
  ]
}

/**
 * Proxies ordnance survey requests from the front end to api.os.com
 * Used for the VTS map source by forwarding on the request
 * and adding the auth token and SRS (spatial reference system)
 * @param {MapConfiguration} options - the map options
 * @returns {ServerRoute<MapProxyGetRequestRefs>}
 */
function mapProxyRoute(options) {
  return {
    method: 'GET',
    path: '/api/map-proxy',
    handler: async (request, h) => {
      const { query } = request
      const targetUrl = new URL(decodeURIComponent(query.url))
      const token = await getAccessToken(options)

      targetUrl.searchParams.set('srs', '3857')

      const proxyResponse = await httpRequest('get', targetUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const buffer = proxyResponse.payload
      const contentType = proxyResponse.res.headers['content-type']
      const response = h.response(buffer)

      if (contentType) {
        response.type(contentType)
      }

      return response
    },
    options: {
      validate: {
        query: Joi.object()
          .keys({
            url: Joi.string().required()
          })
          .optional()
      }
    }
  }
}

/**
 * Proxies ordnance survey requests from the front end to api.os.uk
 * Used for VTS map tiles forwarding on the request and adding the auth token
 * @param {MapConfiguration} options - the map options
 * @returns {ServerRoute<MapProxyGetRequestRefs>}
 */
function tileProxyRoute(options) {
  return {
    method: 'GET',
    path: '/api/tile/{z}/{y}/{x}.pbf',
    handler: async (request, h) => {
      const { z, y, x } = request.params
      const token = await getAccessToken(options)

      const url = `https://api.os.uk/maps/vector/v1/vts/tile/${z}/${y}/${x}.pbf?srs=3857`

      const { payload, res } = await get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/x-protobuf'
        },
        json: false,
        gunzip: true
      })

      if (res.statusCode && res.statusCode !== StatusCodes.OK.valueOf()) {
        return h.response('Tile fetch failed').code(res.statusCode)
      }

      return h
        .response(payload)
        .type('application/x-protobuf')
        .header('Cache-Control', 'public, max-age=86400')
    }
  }
}

/**
 * Proxies ordnance survey geocode requests from the front end to api.os.uk
 * Used for the gazzeteer address lookup to find name from query strings like postcode and place names
 * @param {MapConfiguration} options - the map options
 * @returns {ServerRoute<MapGeocodeGetRequestRefs>}
 */
function geocodeProxyRoute(options) {
  return {
    method: 'GET',
    path: '/api/geocode-proxy',
    async handler(request, _h) {
      const { query } = request
      const data = await find(query.query, options.ordnanceSurveyApiKey)

      return data
    },
    options: {
      validate: {
        query: Joi.object()
          .keys({
            query: Joi.string().required()
          })
          .required()
      }
    }
  }
}

/**
 * Proxies ordnance survey reverse geocode requests from the front end to api.os.uk
 * Used to find name from easting and northing points.
 * N.B this endpoint is currently not used by the front end but will be soon in "maps V2"
 * @param {MapConfiguration} options - the map options
 * @returns {ServerRoute<MapReverseGeocodeGetRequestRefs>}
 */
function reverseGeocodeProxyRoute(options) {
  return {
    method: 'GET',
    path: '/api/reverse-geocode-proxy',
    async handler(request, _h) {
      const { query } = request
      const data = await nearest(
        query.easting,
        query.northing,
        options.ordnanceSurveyApiKey
      )

      return data
    },
    options: {
      validate: {
        query: Joi.object()
          .keys({
            easting: Joi.number().required(),
            northing: Joi.number().required()
          })
          .required()
      }
    }
  }
}

/**
 * Resource routes to return sprites and glyphs
 * @returns {ServerRoute<MapProxyGetRequestRefs>}
 */
function mapStyleResourceRoutes() {
  return {
    method: 'GET',
    path: '/api/maps/vts/{path*}',
    options: {
      handler: {
        directory: {
          path: resolve(import.meta.dirname, './vts')
        }
      }
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { MapConfiguration, MapProxyGetRequestRefs, MapGeocodeGetRequestRefs, MapReverseGeocodeGetRequestRefs } from '~/src/server/plugins/map/types.js'
 */
