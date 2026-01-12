import Joi from 'joi'

import { find, nearest } from '~/src/server/plugins/map/service.js'
import { request as httpRequest } from '~/src/server/services/httpService.js'

/**
 * Gets the map support routes
 * @param {MapConfiguration} options - ordnance survey names api key
 */
export function getRoutes(options) {
  return [
    mapProxyRoute(options),
    geocodeProxyRoute(options),
    reverseGeocodeProxyRoute(options)
  ]
}

/**
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

      // Add API key server-side and set SRS
      targetUrl.searchParams.set('key', options.ordnanceSurveyApiKey)
      if (!targetUrl.searchParams.has('srs')) {
        targetUrl.searchParams.set('srs', '3857')
      }

      const proxyResponse = await httpRequest('get', targetUrl.toString())
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
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { MapConfiguration, MapProxyGetRequestRefs, MapGeocodeGetRequestRefs, MapReverseGeocodeGetRequestRefs } from '~/src/server/plugins/map/types.js'
 */
