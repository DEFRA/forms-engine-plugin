// @ts-expect-error - no types
import OsGridRef, { LatLon } from 'geodesy/osgridref.js'

/**
 * Converts lat long to easting and northing
 * @param {object} param
 * @param {number} param.lat
 * @param {number} param.long
 * @returns {{ easting: number, northing: number }}
 */
function latLongToEastingNorthing({ lat, long }) {
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
function eastingNorthingToLatLong({ easting, northing }) {
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
function latLongToOsGridRef({ lat, long }) {
  const point = new LatLon(lat, long)

  return point.toOsGrid().toString()
}

/**
 * Converts an ordnance survey grid reference to lat long
 * @param {string} osGridRef
 * @returns {{ lat: number, long: number }}
 */
function osGridRefToLatLong(osGridRef) {
  const point = OsGridRef.parse(osGridRef)
  const latLong = point.toLatLon()

  return { lat: latLong.latitude, long: latLong.longitude }
}

// Center of UK
const DEFAULT_LAT = 53.825564
const DEFAULT_LONG = -2.421975

/** @type {DefraMapInitConfig} */
const defaultConfig = {
  zoom: '6',
  center: [DEFAULT_LONG, DEFAULT_LAT]
}

const COMPANY_SYMBOL_CODE = 169
const LOCATION_FIELD_SELECTOR = 'input.govuk-input'
const EVENTS = {
  interactMarkerChange: 'interact:markerchange'
}

const defaultData = {
  VTS_OUTDOOR_URL: '/api/maps/vts/OS_VTS_3857_Outdoor.json',
  VTS_DARK_URL: '/api/maps/vts/OS_VTS_3857_Dark.json',
  VTS_BLACK_AND_WHITE_URL: '/api/maps/vts/OS_VTS_3857_Black_and_White.json'
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

  // TODO: Fix this in `defra-map`
  // If there are location components on the page fix up the main form submit
  // handler so it doesn't fire when using the integrated map search feature
  if (locations.length) {
    const form = document.querySelector('form')

    if (form === null) {
      return
    }

    const buttons = Array.from(form.querySelectorAll('button'))
    form.addEventListener('submit', formSubmitFactory(buttons), false)
  }

  locations.forEach((location, index) => {
    processLocation({ assetPath, apiPath, data }, location, index)
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
    // Only proxy OS API requests that don't already have a key
    if (resourceType !== 'Style' && url.startsWith('https://api.os.uk')) {
      const urlObj = new URL(url)
      if (!urlObj.searchParams.has('key')) {
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
 * Processes a location field to add map capability
 * @param {MapsEnvironmentConfig} config - the location field element
 * @param {Element} location - the location field element
 * @param {*} index - the 0-based index
 */
function processLocation(config, location, index) {
  if (!(location instanceof HTMLDivElement)) {
    return
  }

  const locationInputs = location.querySelector('.app-location-field-inputs')
  if (!(locationInputs instanceof HTMLDivElement)) {
    return
  }
  const locationType = location.dataset.locationtype

  // Check for support
  const supportedLocations = [
    'latlongfield',
    'eastingnorthingfield',
    'osgridreffield'
  ]
  if (!locationType || !supportedLocations.includes(locationType)) {
    return
  }

  const mapContainer = document.createElement('div')
  const mapId = `map_${index}`

  mapContainer.setAttribute('id', mapId)
  mapContainer.setAttribute('class', 'map-container')

  const initConfig = getInitMapConfig(location) ?? defaultConfig

  locationInputs.after(mapContainer)

  const map = createMap(mapId, initConfig, config)

  map.on(
    'map:ready',
    /**
     * Callback function which fires when the map is ready
     * @param {object} e - the event
     * @param {MapLibreMap} e.map - the map provider instance
     */
    function onMapReady(e) {
      switch (locationType) {
        case 'latlongfield':
          bindLatLongField(location, map, e.map)
          break
        case 'eastingnorthingfield':
          bindEastingNorthingField(location, map, e.map)
          break
        case 'osgridreffield':
          bindOsGridRefField(location, map, e.map)
          break
        default:
          throw new Error('Not implemented')
      }

      // Add info panel
      map.addPanel('info', {
        showLabel: true,
        label: 'How to use the map',
        mobile: {
          slot: 'bottom',
          initiallyOpen: true,
          dismissable: true,
          modal: false
        },
        tablet: {
          slot: 'bottom',
          initiallyOpen: true,
          dismissable: true,
          modal: false
        },
        desktop: {
          slot: 'bottom',
          initiallyOpen: true,
          dismissable: true,
          modal: false
        },
        html: 'If using a map click on a point to update the location.<br><br>If using a keyboard, navigate to the point, centering the crosshair at the location and press enter.'
      })
    }
  )
}

/**
 * Create a Defra map instance
 * @param {string} mapId - the map id
 * @param {DefraMapInitConfig} initConfig - the map initial configuration
 * @param {MapsEnvironmentConfig} mapsConfig - the map environment params
 */
function createMap(mapId, initConfig, mapsConfig) {
  const { assetPath, apiPath, data = defaultData } = mapsConfig
  const logoAltText = 'Ordnance survey logo'

  // @ts-expect-error - Defra namespace currently comes from UMD support files
  const defra = window.defra

  /** @type {DefraMap} */
  const map = new defra.DefraMap(mapId, {
    ...initConfig,
    mapProvider: defra.maplibreProvider(),
    reverseGeocodeProvider: defra.openNamesProvider({
      url: `${apiPath}/reverse-geocode-proxy?easting={easting}&northing={northing}`
    }),
    behaviour: 'inline',
    minZoom: 6,
    maxZoom: 18,
    containerHeight: '400px',
    transformRequest: makeTileRequestTransformer(apiPath),
    plugins: [
      defra.mapStylesPlugin({
        mapStyles: [
          {
            id: 'outdoor',
            label: 'Outdoor',
            url: data.VTS_OUTDOOR_URL,
            thumbnail: `${assetPath}/defra-map/assets/images/outdoor-map-thumb.jpg`,
            logo: `${assetPath}/defra-map/assets/images/os-logo.svg`,
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
            thumbnail: `${assetPath}/defra-map/assets/images/dark-map-thumb.jpg`,
            logo: `${assetPath}/defra-map/assets/images/os-logo-white.svg`,
            logoAltText,
            attribution: `Contains OS data ${String.fromCodePoint(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`
          },
          {
            id: 'black-and-white',
            label: 'Black/White',
            url: data.VTS_BLACK_AND_WHITE_URL,
            thumbnail: `${assetPath}/defra-map/assets/images/black-and-white-map-thumb.jpg`,
            logo: `${assetPath}/defra-map/assets/images/os-logo-black.svg`,
            logoAltText,
            attribution: `Contains OS data ${String.fromCodePoint(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`
          }
        ]
      }),
      defra.interactPlugin({
        dataLayers: [],
        markerColor: { outdoor: '#ff0000', dark: '#00ff00' },
        interactionMode: 'marker',
        multiSelect: false
      }),
      defra.searchPlugin({
        osNamesURL: `${apiPath}/geocode-proxy?query={query}`,
        width: '300px',
        showMarker: false
      }),
      defra.zoomControlsPlugin(),
      defra.scaleBarPlugin({
        units: 'metric'
      })
    ]
  })

  return map
}

/**
 * Gets initial map config for a location field
 * @param {HTMLDivElement} locationField - the location field element
 */
function getInitMapConfig(locationField) {
  const locationType = locationField.dataset.locationtype

  switch (locationType) {
    case 'latlongfield':
      return getInitLatLongMapConfig(locationField)
    case 'eastingnorthingfield':
      return getInitEastingNorthingMapConfig(locationField)
    case 'osgridreffield':
      return getInitOsGridRefMapConfig(locationField)
    default:
      throw new Error('Not implemented')
  }
}

/**
 * Validates lat and long is numeric and within UK bounds
 * @param {string} strLat - the latitude string
 * @param {string} strLong - the longitude string
 * @returns {{ valid: false } | { valid: true, value: { lat: number, long: number } }}
 */
function validateLatLong(strLat, strLong) {
  const lat = strLat.trim() && Number(strLat.trim())
  const long = strLong.trim() && Number(strLong.trim())

  if (!lat || !long) {
    return { valid: false }
  }

  const latMin = 49.85
  const latMax = 60.859
  const longMin = -13.687
  const longMax = 1.767

  const latInBounds = lat >= latMin && lat <= latMax
  const longInBounds = long >= longMin && long <= longMax

  if (!latInBounds || !longInBounds) {
    return { valid: false }
  }

  return { valid: true, value: { lat, long } }
}

/**
 * Validates easting and northing is numeric and within UK bounds
 * @param {string} strEasting - the easting string
 * @param {string} strNorthing - the northing string
 * @returns {{ valid: false } | { valid: true, value: { easting: number, northing: number } }}
 */
function validateEastingNorthing(strEasting, strNorthing) {
  const easting = strEasting.trim() && Number(strEasting.trim())
  const northing = strNorthing.trim() && Number(strNorthing.trim())

  if (!easting || !northing) {
    return { valid: false }
  }

  const eastingMin = 0
  const eastingMax = 700000
  const northingMin = 0
  const northingMax = 1300000

  const latInBounds = easting >= eastingMin && easting <= eastingMax
  const longInBounds = northing >= northingMin && northing <= northingMax

  if (!latInBounds || !longInBounds) {
    return { valid: false }
  }

  return { valid: true, value: { easting, northing } }
}

/**
 * Validates OS grid reference is correct
 * @param {string} osGridRef - the OsGridRef
 * @returns {{ valid: false } | { valid: true, value: string }}
 */
function validateOsGridRef(osGridRef) {
  if (!osGridRef) {
    return { valid: false }
  }

  const pattern =
    /^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\s?(([0-9]{3})\s?([0-9]{3})|([0-9]{4})\s?([0-9]{4})|([0-9]{5})\s?([0-9]{5}))$/

  const match = pattern.exec(osGridRef)

  if (match === null) {
    return { valid: false }
  }

  return { valid: true, value: match[0] }
}

/**
 * Gets the inputs for a latlong location field
 * @param {HTMLDivElement} locationField - the latlong location field element
 */
function getLatLongInputs(locationField) {
  const inputs = locationField.querySelectorAll(LOCATION_FIELD_SELECTOR)

  if (inputs.length !== 2) {
    throw new Error('Expected 2 inputs for lat and long')
  }

  const latInput = /** @type {HTMLInputElement} */ (inputs[0])
  const longInput = /** @type {HTMLInputElement} */ (inputs[1])

  return { latInput, longInput }
}

/**
 * Gets the inputs for a easting/northing location field
 * @param {HTMLDivElement} locationField - the eastingnorthing location field element
 */
function getEastingNorthingInputs(locationField) {
  const inputs = locationField.querySelectorAll(LOCATION_FIELD_SELECTOR)

  if (inputs.length !== 2) {
    throw new Error('Expected 2 inputs for easting and northing')
  }

  const eastingInput = /** @type {HTMLInputElement} */ (inputs[0])
  const northingInput = /** @type {HTMLInputElement} */ (inputs[1])

  return { eastingInput, northingInput }
}

/**
 * Gets the input for a OS grid reference location field
 * @param {HTMLDivElement} locationField - the osgridref location field element
 */
function getOsGridRefInput(locationField) {
  const input = locationField.querySelector(LOCATION_FIELD_SELECTOR)

  if (input === null) {
    throw new Error('Expected 1 input for osgridref')
  }

  return /** @type {HTMLInputElement} */ (input)
}

/**
 * Gets initial map config for a latlong location field
 * @param {HTMLDivElement} locationField - the latlong location field element
 * @returns {DefraMapInitConfig | undefined}
 */
function getInitLatLongMapConfig(locationField) {
  const { latInput, longInput } = getLatLongInputs(locationField)
  const result = validateLatLong(latInput.value, longInput.value)

  if (!result.valid) {
    return undefined
  }

  /** @type {MapCenter} */
  const center = [result.value.long, result.value.lat]

  return {
    zoom: '16',
    center,
    markers: [
      {
        id: 'location',
        coords: center
      }
    ]
  }
}

/**
 * Gets initial map config for a easting/northing location field
 * @param {HTMLDivElement} locationField - the eastingnorthing location field element
 * @returns {DefraMapInitConfig | undefined}
 */
function getInitEastingNorthingMapConfig(locationField) {
  const { eastingInput, northingInput } =
    getEastingNorthingInputs(locationField)
  const result = validateEastingNorthing(
    eastingInput.value,
    northingInput.value
  )

  if (!result.valid) {
    return undefined
  }

  const latlong = eastingNorthingToLatLong(result.value)

  /** @type {MapCenter} */
  const center = [latlong.long, latlong.lat]

  return {
    zoom: '16',
    center,
    markers: [
      {
        id: 'location',
        coords: center
      }
    ]
  }
}

/**
 * Gets initial map config for an OS grid reference location field
 * @param {HTMLDivElement} locationField - the osgridref location field element
 * @returns {DefraMapInitConfig | undefined}
 */
function getInitOsGridRefMapConfig(locationField) {
  const osGridRefInput = getOsGridRefInput(locationField)
  const result = validateOsGridRef(osGridRefInput.value)

  if (!result.valid) {
    return undefined
  }

  const latlong = osGridRefToLatLong(result.value)

  /** @type {MapCenter} */
  const center = [latlong.long, latlong.lat]

  return {
    zoom: '16',
    center,
    markers: [
      {
        id: 'location',
        coords: center
      }
    ]
  }
}

/**
 * Bind a latlong field to the map
 * @param {HTMLDivElement} locationField - the latlong location field
 * @param {DefraMap} map - the map component instance (of DefraMap)
 * @param {MapLibreMap} mapProvider - the map provider instance (of MapLibreMap)
 */
function bindLatLongField(locationField, map, mapProvider) {
  const { latInput, longInput } = getLatLongInputs(locationField)

  map.on(
    EVENTS.interactMarkerChange,
    /**
     * Callback function which fires when the map marker changes
     * @param {object} e - the event
     * @param {[number, number]} e.coords - the map marker coordinates
     */
    function onInteractMarkerChange(e) {
      const maxPrecision = 7
      latInput.value = e.coords[1].toFixed(maxPrecision)
      longInput.value = e.coords[0].toFixed(maxPrecision)
    }
  )

  /**
   * Lat & long input change event listener
   * Update the map view location when the inputs are changed
   */
  function onUpdateInputs() {
    const result = validateLatLong(latInput.value, longInput.value)

    if (result.valid) {
      /** @type {MapCenter} */
      const center = [result.value.long, result.value.lat]

      centerMap(map, mapProvider, center)
    }
  }

  latInput.addEventListener('change', onUpdateInputs, false)
  longInput.addEventListener('change', onUpdateInputs, false)
}

/**
 * Bind an eastingnorthing field to the map
 * @param {HTMLDivElement} locationField - the eastingnorthing location field
 * @param {DefraMap} map - the map component instance (of DefraMap)
 * @param {MapLibreMap} mapProvider - the map provider instance (of MapLibreMap)
 */
function bindEastingNorthingField(locationField, map, mapProvider) {
  const { eastingInput, northingInput } =
    getEastingNorthingInputs(locationField)

  map.on(
    EVENTS.interactMarkerChange,
    /**
     * Callback function which fires when the map marker changes
     * @param {object} e - the event
     * @param {[number, number]} e.coords - the map marker coordinates
     */
    function onInteractMarkerChange(e) {
      const maxPrecision = 0
      const point = latLongToEastingNorthing({
        lat: e.coords[1],
        long: e.coords[0]
      })

      eastingInput.value = point.easting.toFixed(maxPrecision)
      northingInput.value = point.northing.toFixed(maxPrecision)
    }
  )

  /**
   * Easting & northing input change event listener
   * Update the map view location when the inputs are changed
   */
  function onUpdateInputs() {
    const result = validateEastingNorthing(
      eastingInput.value,
      northingInput.value
    )

    if (result.valid) {
      const latlong = eastingNorthingToLatLong(result.value)

      /** @type {MapCenter} */
      const center = [latlong.long, latlong.lat]

      centerMap(map, mapProvider, center)
    }
  }

  eastingInput.addEventListener('change', onUpdateInputs, false)
  northingInput.addEventListener('change', onUpdateInputs, false)
}

/**
 * Bind an OS grid reference field to the map
 * @param {HTMLDivElement} locationField - the osgridref location field
 * @param {DefraMap} map - the map component instance (of DefraMap)
 * @param {MapLibreMap} mapProvider - the map provider instance (of MapLibreMap)
 */
function bindOsGridRefField(locationField, map, mapProvider) {
  const osGridRefInput = getOsGridRefInput(locationField)

  map.on(
    EVENTS.interactMarkerChange,
    /**
     * Callback function which fires when the map marker changes
     * @param {object} e - the event
     * @param {[number, number]} e.coords - the map marker coordinates
     */
    function onInteractMarkerChange(e) {
      const point = latLongToOsGridRef({
        lat: e.coords[1],
        long: e.coords[0]
      })

      osGridRefInput.value = point
    }
  )

  /**
   * OS grid reference input change event listener
   * Update the map view location when the input is changed
   */
  function onUpdateInput() {
    const result = validateOsGridRef(osGridRefInput.value)

    if (result.valid) {
      const latlong = osGridRefToLatLong(result.value)

      /** @type {MapCenter} */
      const center = [latlong.long, latlong.lat]

      centerMap(map, mapProvider, center)
    }
  }

  osGridRefInput.addEventListener('change', onUpdateInput, false)
}

/**
 * Updates the marker position and moves the map view port the new location
 * @param {DefraMap} map - the map component instance (of DefraMap)
 * @param {MapLibreMap} mapProvider - the map provider instance (of MapLibreMap)
 * @param {MapCenter} center - the point
 */
function centerMap(map, mapProvider, center) {
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
 * @typedef {object} DefraMap - an instance of a DefraMap
 * @property {Function} on - register callback listeners to map events
 * @property {Function} addPanel - adds a new panel to the map
 * @property {Function} addMarker - adds/updates a marker
 */

/**
 * @typedef {object} MapLibreMap
 * @property {Function} flyTo - pans/zooms to a new location
 */

/**
 * @typedef {[number, number]} MapCenter - Map center point as [long, lat]
 */

/**
 * @typedef {object} DefraMapInitConfig - additional config that can be provided to DefraMap
 * @property {string} zoom - the zoom level of the map
 * @property {MapCenter} center - the center point of the map
 * @property {{ id: string, coords: MapCenter}[]} [markers] - the markers to add to the map
 */

/**
 * @typedef {object} TileData
 * @property {string} VTS_OUTDOOR_URL - the outdoor tile URL
 * @property {string} VTS_DARK_URL - the dark tile URL
 * @property {string} VTS_BLACK_AND_WHITE_URL - the black and white tile URL
 */

/**
 * @typedef {object} MapsEnvironmentConfig
 * @property {string} assetPath - the root asset path
 * @property {string} apiPath - the root API path
 * @property {TileData} data - the tile data config
 */
