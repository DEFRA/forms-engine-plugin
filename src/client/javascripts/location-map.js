// Center of UK
const DEFAULT_LAT = 53.825564
const DEFAULT_LONG = -2.421975

/** @type {DefraMapInitConfig} */
const defaultConfig = {
  zoom: '6',
  center: [DEFAULT_LONG, DEFAULT_LAT]
}

const COMPANY_SYMBOL_CODE = 169

const defaultData = {
  VTS_OUTDOOR_URL:
    'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Outdoor.json',
  VTS_DARK_URL:
    'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Dark.json',
  VTS_BLACK_AND_WHITE_URL:
    'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Black_and_White.json'
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
  const supportedLocations = ['latlongfield']
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
            attribution: `Contains OS data ${String.fromCharCode(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`,
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
            attribution: 'Test'
          },
          {
            id: 'black-and-white',
            label: 'Black/White',
            url: data.VTS_BLACK_AND_WHITE_URL,
            thumbnail: `${assetPath}/defra-map/assets/images/black-and-white-map-thumb.jpg`,
            logo: `${assetPath}/defra-map/assets/images/os-logo-black.svg`,
            logoAltText,
            attribution: 'Test'
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
 * Gets initial map config for a latlong location field
 * @param {HTMLDivElement} locationField - the latlong location field element
 */
function getLatLongInputs(locationField) {
  const inputs = locationField.querySelectorAll('input.govuk-input')

  if (inputs.length !== 2) {
    throw new Error('Expected 2 inputs for lat and long')
  }

  const latInput = /** @type {HTMLInputElement} */ (inputs[0])
  const longInput = /** @type {HTMLInputElement} */ (inputs[1])

  return { latInput, longInput }
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

  return {
    zoom: '16',
    center: [result.value.long, result.value.lat],
    markers: [
      {
        id: 'location',
        coords: [result.value.long, result.value.lat]
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
    'interact:markerchange',
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

      // Move the 'location' marker to the new point
      map.addMarker('location', center)

      // Pan & zoom the map to the new valid location
      mapProvider.flyTo({
        center,
        zoom: 14,
        essential: true
      })
    }
  }

  latInput.addEventListener('change', onUpdateInputs, false)
  longInput.addEventListener('change', onUpdateInputs, false)
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
