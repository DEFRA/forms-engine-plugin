import { centroid } from '@turf/centroid'
// @ts-expect-error - no types
import OsGridRef, { LatLon } from 'geodesy/osgridref.js'

import { processGeospatial } from '~/src/client/javascripts/geospatial-map.js'
import { processLocation } from '~/src/client/javascripts/location-map.js'

// Center of UK
const DEFAULT_LAT = 53.825564
const DEFAULT_LONG = -2.421975
const COMPANY_SYMBOL_CODE = 169

const defaultData = {
  VTS_OUTDOOR_URL: '/api/maps/vts/OS_VTS_3857_Outdoor.json',
  VTS_DARK_URL: '/api/maps/vts/OS_VTS_3857_Dark.json',
  VTS_BLACK_AND_WHITE_URL: '/api/maps/vts/OS_VTS_3857_Black_and_White.json',
  VTS_AERIAL_URL: '/api/maps/vts/esri-aerial.json'
}

/**
 * Converts lat long to easting and northing
 * @param {object} param
 * @param {number} param.lat
 * @param {number} param.long
 * @returns {{ easting: number, northing: number }}
 */
export function latLongToEastingNorthing({ lat, long }) {
  const point = new LatLon(lat, long)

  return point.toOsGrid()
}

/**
 * Converts easting and northing to lat long
 * @param {object} param
 * @param {number} param.easting
 * @param {number} param.northing
 * @returns {{ lat: number, long: number }}
 */
export function eastingNorthingToLatLong({ easting, northing }) {
  const point = new OsGridRef(easting, northing)
  const latLong = point.toLatLon()

  return { lat: latLong.latitude, long: latLong.longitude }
}

/**
 * Converts lat long to an ordnance survey grid reference
 * @param {object} param
 * @param {number} param.lat
 * @param {number} param.long
 * @returns {string}
 */
export function latLongToOsGridRef({ lat, long }) {
  const point = new LatLon(lat, long)

  return point.toOsGrid().toString()
}

/**
 * Converts an ordnance survey grid reference to lat long
 * @param {string} osGridRef
 * @returns {{ lat: number, long: number }}
 */
export function osGridRefToLatLong(osGridRef) {
  const point = OsGridRef.parse(osGridRef)
  const latLong = point.toLatLon()

  return { lat: latLong.latitude, long: latLong.longitude }
}

/**
 * Get the grid ref from the first coordinate of a long/lat feature
 * @param {Feature} feature
 */
export function getCoordinateGridRef(feature) {
  if (feature.geometry.type === 'Point') {
    const [long, lat] = feature.geometry.coordinates
    const point = new LatLon(lat, long)

    return point.toOsGrid().toString()
  } else if (feature.geometry.type === 'LineString') {
    const [long, lat] = feature.geometry.coordinates[0]
    const point = new LatLon(lat, long)

    return point.toOsGrid().toString()
  } else {
    const [long, lat] = feature.geometry.coordinates[0][0]
    const point = new LatLon(lat, long)

    return point.toOsGrid().toString()
  }
}

/**
 * Get the centroid grid ref from a long/lat feature
 * @param {Feature} feature
 */
export function getCentroidGridRef(feature) {
  if (feature.geometry.type === 'Point') {
    const [long, lat] = feature.geometry.coordinates
    const point = new LatLon(lat, long)

    return point.toOsGrid().toString()
  } else {
    const centre = centroid(feature)
    const [long, lat] = centre.geometry.coordinates
    const point = new LatLon(lat, long)

    return point.toOsGrid().toString()
  }
}

/** @type {InteractiveMapInitConfig} */
export const defaultConfig = {
  zoom: '6',
  center: [DEFAULT_LONG, DEFAULT_LAT]
}

export const EVENTS = {
  mapReady: 'map:ready',
  interactMarkerChange: 'interact:markerchange',
  drawReady: 'draw:ready',
  drawCreated: 'draw:created',
  drawEdited: 'draw:edited',
  drawCancelled: 'draw:cancelled'
}

/**
 * Make a form submit handler that only allows submissions from allowed buttons
 * @param {HTMLButtonElement[]} buttons - the form buttons to allow submissions
 */
export function formSubmitFactory(buttons) {
  /**
   * The submit handler
   * @param {SubmitEvent} e
   */
  const onFormSubmit = function (e) {
    if (
      !(e.submitter instanceof HTMLButtonElement) ||
      !buttons.includes(e.submitter)
    ) {
      e.preventDefault()
    }
  }

  return onFormSubmit
}

/**
 * Initialise location maps
 * @param {Partial<MapsEnvironmentConfig>} config - the map configuration
 */
export function initMaps(config = {}) {
  const {
    assetPath = '/assets',
    apiPath = '/form/api',
    data = defaultData
  } = config
  const locations = document.querySelectorAll('.app-location-field')
  const geospatials = document.querySelectorAll('.app-geospatial-field')

  // TODO: Fix this in `interactive-map`
  // If there are location components on the page fix up the main form submit
  // handler so it doesn't fire when using the integrated map search feature
  if (locations.length) {
    const form = locations[0].closest('form')

    if (form === null) {
      return
    }

    const buttons = Array.from(form.querySelectorAll('button'))
    form.addEventListener('submit', formSubmitFactory(buttons), false)
  }

  if (geospatials.length) {
    const form = geospatials[0].closest('form')

    if (form === null) {
      return
    }

    const buttons = Array.from(form.querySelectorAll('button'))
    form.addEventListener('submit', formSubmitFactory(buttons), false)
  }

  locations.forEach((location, index) => {
    processLocation({ assetPath, apiPath, data }, location, index)
  })

  geospatials.forEach((geospatial, index) => {
    processGeospatial({ assetPath, apiPath, data }, geospatial, index)
  })
}

/**
 * OS API request proxy factory
 * @param {string} apiPath - the root API path
 */
export function makeTileRequestTransformer(apiPath) {
  /**
   * Proxy OS API requests via our server
   * @param {string} url - the request URL
   * @param {string} resourceType - the resource type
   */
  return function transformTileRequest(url, resourceType) {
    if (url.startsWith('https://api.os.uk')) {
      if (resourceType === 'Tile') {
        return {
          url: url.replace(
            'https://api.os.uk/maps/vector/v1/vts',
            `${window.location.origin}${apiPath}`
          ),
          headers: {}
        }
      }

      if (resourceType !== 'Style') {
        return {
          url: `${apiPath}/map-proxy?url=${encodeURIComponent(url)}`,
          headers: {}
        }
      }
    }

    const spritesPath =
      'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main'

    // Proxy sprite requests
    if (url.startsWith(spritesPath)) {
      const path = url.substring(spritesPath.length)
      return {
        url: `${apiPath}/maps/vts${path}`,
        headers: {}
      }
    }

    return { url, headers: {} }
  }
}

/**
 * Temporary transform request function to transform geocode requests. Fixed in v0.0.18 of interactive map so this is not needed when we upgrade.
 * @param {object} request
 * @param {string} request.url
 * @param {{ method: 'get' }} request.options
 * @returns {Request}
 */
export const transformGeocodeRequest = (request) => {
  const url = new URL(request.url, window.location.origin)
  return new Request(url.toString(), request.options)
}

/**
 * Gets the map styles for the interactive map style switcher plugin
 * @param {TileData} data - the tile data config
 * @param {string} assetPath
 */
function getMapStyles(data, assetPath) {
  const logoAltText = 'Ordnance survey logo'

  return [
    {
      id: 'outdoor',
      label: 'Outdoor',
      url: data.VTS_OUTDOOR_URL,
      thumbnail: `${assetPath}/interactive-map/assets/images/outdoor-map-thumb.jpg`,
      logo: `${assetPath}/interactive-map/assets/images/os-logo.svg`,
      logoAltText,
      attribution: `Contains OS data ${String.fromCodePoint(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`,
      backgroundColor: '#f5f5f0'
    },
    {
      id: 'dark',
      label: 'Dark',
      url: data.VTS_DARK_URL,
      mapColorScheme: 'dark',
      appColorScheme: 'dark',
      thumbnail: `${assetPath}/interactive-map/assets/images/dark-map-thumb.jpg`,
      logo: `${assetPath}/interactive-map/assets/images/os-logo-white.svg`,
      logoAltText,
      attribution: `Contains OS data ${String.fromCodePoint(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`
    },
    {
      id: 'black-and-white',
      label: 'Black/White',
      url: data.VTS_BLACK_AND_WHITE_URL,
      thumbnail: `${assetPath}/interactive-map/assets/images/black-and-white-map-thumb.jpg`,
      logo: `${assetPath}/interactive-map/assets/images/os-logo-black.svg`,
      logoAltText,
      attribution: `Contains OS data ${String.fromCodePoint(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`
    },
    {
      id: 'aerial',
      label: 'Aerial',
      url: data.VTS_AERIAL_URL,
      thumbnail: `${assetPath}/interactive-map/assets/images/aerial-map-thumb.jpg`,
      attribution: `Tiles ${String.fromCodePoint(COMPANY_SYMBOL_CODE)} Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community ${new Date().getFullYear()}`
    }
  ]
}

/**
 * Create a Defra map instance
 * @param {string} mapId - the map id
 * @param {InteractiveMapInitConfig} initConfig - the map initial configuration
 * @param {MapsEnvironmentConfig} mapsConfig - the map environment params
 */
export function createMap(mapId, initConfig, mapsConfig) {
  const { assetPath, apiPath, data = defaultData } = mapsConfig

  // @ts-expect-error - Defra namespace currently comes from UMD support files
  const defra = window.defra

  const interactPlugin = defra.interactPlugin({
    markerColor: { outdoor: '#ff0000', dark: '#00ff00' },
    interactionMode: 'marker',
    multiSelect: false
  })

  /** @type {InteractiveMap} */
  const map = new defra.InteractiveMap(mapId, {
    enableFullscreen: true,
    autoColorScheme: false,
    mapProvider: defra.maplibreProvider(),
    reverseGeocodeProvider: defra.openNamesProvider({
      url: `${apiPath}/reverse-geocode-proxy?easting={easting}&northing={northing}`
    }),
    behaviour: 'inline',
    minZoom: 6,
    maxZoom: 18,
    containerHeight: '400px',
    enableZoomControls: true,
    transformRequest: makeTileRequestTransformer(apiPath),
    ...initConfig,
    plugins: [
      defra.mapStylesPlugin({
        mapStyles: getMapStyles(data, assetPath)
      }),
      interactPlugin,
      defra.searchPlugin({
        transformRequest: transformGeocodeRequest,
        osNamesURL: `${apiPath}/geocode-proxy?query={query}`,
        width: '300px',
        showMarker: false
      }),
      defra.scaleBarPlugin({
        units: 'metric'
      }),
      ...(initConfig.plugins ?? [])
    ]
  })

  return { map, interactPlugin }
}

/**
 * Updates the marker position and moves the map view port the new location
 * @param {InteractiveMap} map - the map component instance (of InteractiveMap)
 * @param {MapLibreMap} mapProvider - the map provider instance (of MapLibreMap)
 * @param {MapCenter} center - the point
 */
export function centerMap(map, mapProvider, center) {
  // Move the 'location' marker to the new point
  map.addMarker('location', center)

  // Pan & zoom the map to the new valid location
  mapProvider.flyTo({
    center,
    zoom: 14,
    essential: true
  })
}

/**
 * @typedef {object} InteractiveMap - an instance of a InteractiveMap
 * @property {Function} on - register callback listeners to map events
 * @property {Function} addPanel - adds a new panel to the map
 * @property {Function} addMarker - adds/updates a marker
 * @property {Function} removeMarker - removes a marker
 * @property {Function} addButton - adds/updates a button
 * @property {Function} toggleButtonState - toggle the state of a button
 */

/**
 * @typedef {object} MapLibreMap
 * @property {Function} flyTo - pans/zooms to a new location
 * @property {Function} fitBounds - fits the my to the new bounds
 */

/**
 * @typedef {[number, number]} MapCenter - Map center point as [long, lat]
 */

/**
 * @typedef {object} InteractiveMapInitConfig - additional config that can be provided to InteractiveMap
 * @property {string} zoom - the zoom level of the map
 * @property {MapCenter} center - the center point of the map
 * @property {{ id: string, coords: MapCenter }[]} [markers] - the markers to add to the map
 * @property {any[]} [plugins] - additional plugins
 */

/**
 * @typedef {object} TileData
 * @property {string} VTS_OUTDOOR_URL - the outdoor tile URL
 * @property {string} VTS_DARK_URL - the dark tile URL
 * @property {string} VTS_BLACK_AND_WHITE_URL - the black and white tile URL
 * @property {string} VTS_AERIAL_URL - the aerial tile URL
 */

/**
 * @typedef {object} MapsEnvironmentConfig
 * @property {string} assetPath - the root asset path
 * @property {string} apiPath - the root API path
 * @property {TileData} data - the tile data config
 */

/**
 * @import { Feature } from '~/src/server/plugins/engine/types.js'
 */
