import { resolve } from 'node:path'

import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { find, nearest } from '~/src/server/plugins/map/service.js'

const logger = createLogger()

/**
 * Gets the map support routes
 * @param {MapConfiguration} options - ordnance survey names api key
 */
export function getRoutes(options) {
  return [
    mapProxyRoute(options),
    geocodeProxyRoute(options),
    reverseGeocodeProxyRoute(options),
    ...tileRoutes()
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

      try {
        const targetUrl = new URL(decodeURIComponent(query.url))

        // Add API key server-side
        targetUrl.searchParams.set('key', options.ordnanceSurveyApiKey)
        if (!targetUrl.searchParams.has('srs')) {
          targetUrl.searchParams.set('srs', '3857')
        }

        const response = await fetch(targetUrl.toString())
        const buffer = await response.arrayBuffer()
        const contentType = response.headers.get('content-type')

        return h
          .response(Buffer.from(buffer))
          .type(contentType ?? 'text/json')
          .code(response.status)
      } catch (err) {
        logger.error(err, 'Proxy error')
        return h
          .response('Proxy failed')
          .code(StatusCodes.INTERNAL_SERVER_ERROR)
      }
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

      // Remove the URI field from the header
      if (data.header.uri) {
        data.header.uri = '/forms/api/geocode-proxy'
      }

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

      // Remove the URI field from the header
      if (data.header.uri) {
        data.header.uri = '/forms/api/reverse-geocode-proxy'
      }

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

function tileRoutes() {
  return [
    {
      method: 'GET',
      path: '/api/maps/vts/{path}',
      options: {
        handler: {
          directory: {
            path: resolve(import.meta.dirname, './vts')
          }
        }
      }
    }
  ]
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { MapConfiguration, MapProxyGetRequestRefs, MapGeocodeGetRequestRefs, MapReverseGeocodeGetRequestRefs } from '~/src/server/plugins/map/types.js'
 */
