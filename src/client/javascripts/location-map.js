import {
  EVENTS,
  centerMap,
  createMap,
  defaultConfig,
  eastingNorthingToLatLong,
  latLongToEastingNorthing,
  latLongToOsGridRef,
  osGridRefToLatLong
} from '~/src/client/javascripts/map.js'

const LOCATION_FIELD_SELECTOR = 'input.govuk-input'

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
 * Get the initial map config for a center point
 * @param {MapCenter} center - the point
 */
function getInitMapCenterConfig(center) {
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
 * Gets initial map config for a latlong location field
 * @param {HTMLDivElement} locationField - the latlong location field element
 * @returns {InteractiveMapInitConfig | undefined}
 */
function getInitLatLongMapConfig(locationField) {
  const { latInput, longInput } = getLatLongInputs(locationField)
  const result = validateLatLong(latInput.value, longInput.value)

  if (!result.valid) {
    return undefined
  }

  /** @type {MapCenter} */
  const center = [result.value.long, result.value.lat]

  return getInitMapCenterConfig(center)
}

/**
 * Gets initial map config for a easting/northing location field
 * @param {HTMLDivElement} locationField - the eastingnorthing location field element
 * @returns {InteractiveMapInitConfig | undefined}
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

  return getInitMapCenterConfig(center)
}

/**
 * Gets initial map config for an OS grid reference location field
 * @param {HTMLDivElement} locationField - the osgridref location field element
 * @returns {InteractiveMapInitConfig | undefined}
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

  return getInitMapCenterConfig(center)
}

/**
 * Bind a latlong field to the map
 * @param {HTMLDivElement} locationField - the latlong location field
 * @param {InteractiveMap} map - the map component instance (of InteractiveMap)
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
 * @param {InteractiveMap} map - the map component instance (of InteractiveMap)
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
 * @param {InteractiveMap} map - the map component instance (of InteractiveMap)
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
 * Processes a location field to add map capability
 * @param {MapsEnvironmentConfig} config - the location field element
 * @param {Element} location - the location field element
 * @param {number} index - the 0-based index
 */
export function processLocation(config, location, index) {
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

  const { map, interactPlugin } = createMap(mapId, initConfig, config)

  map.on(
    EVENTS.mapReady,
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
          slot: 'drawer',
          open: true,
          dismissible: true,
          modal: false
        },
        tablet: {
          slot: 'drawer',
          open: true,
          dismissible: true,
          modal: false
        },
        desktop: {
          slot: 'drawer',
          open: true,
          dismissible: true,
          modal: false
        },
        html: 'If using a map click on a point to update the location.<br><br>If using a keyboard, navigate to the point, centering the crosshair at the location and press enter.'
      })

      // Enable the interact plugin
      interactPlugin.enable()
    }
  )
}

/**
 * @import { InteractiveMap, InteractiveMapInitConfig, MapCenter, MapLibreMap, MapsEnvironmentConfig } from '~/src/client/javascripts/map.js'
 */
