import { bbox } from '@turf/bbox'
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

/** @type {InteractiveMapInitConfig} */
const defaultConfig = {
  zoom: '6',
  center: [DEFAULT_LONG, DEFAULT_LAT]
}

const COMPANY_SYMBOL_CODE = 169
const LOCATION_FIELD_SELECTOR = 'input.govuk-input'
const EVENTS = {
  mapReady: 'map:ready',
  interactMarkerChange: 'interact:markerchange',
  drawReady: 'draw:ready',
  drawCreated: 'draw:created',
  drawEdited: 'draw:edited',
  drawCancelled: 'draw:cancelled'
}

const defaultData = {
  VTS_OUTDOOR_URL: '/api/maps/vts/OS_VTS_3857_Outdoor.json',
  VTS_DARK_URL: '/api/maps/vts/OS_VTS_3857_Dark.json',
  VTS_BLACK_AND_WHITE_URL: '/api/maps/vts/OS_VTS_3857_Black_and_White.json'
}

const lineFeatureProperties = {
  stroke: 'rgba(0, 11, 112, 1)',
  fill: 'rgba(0, 11, 112, 0.2)',
  strokeWidth: 2
}

const polygonFeatureProperties = {
  stroke: 'rgba(0,112,60,1)',
  fill: 'rgba(0,112,60,0.2)',
  strokeWidth: 2
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
  } else if (geospatials.length) {
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
 * Processes a location field to add map capability
 * @param {MapsEnvironmentConfig} config - the location field element
 * @param {Element} location - the location field element
 * @param {number} index - the 0-based index
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
          slot: 'bottom',
          open: true,
          dismissible: true,
          modal: false
        },
        tablet: {
          slot: 'bottom',
          open: true,
          dismissible: true,
          modal: false
        },
        desktop: {
          slot: 'bottom',
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
 * Processes a geospatial field to add map capability
 * @param {MapsEnvironmentConfig} config - the geospatial field element
 * @param {Element} geospatial - the geospatial field element
 * @param {number} index - the 0-based index
 */
function processGeospatial(config, geospatial, index) {
  // @ts-expect-error - Defra namespace currently comes from UMD support files
  const defra = window.defra

  if (!(geospatial instanceof HTMLDivElement)) {
    return
  }

  const geospatialInput = geospatial.querySelector('.govuk-textarea')
  if (!(geospatialInput instanceof HTMLTextAreaElement)) {
    return
  }

  const mapContainer = document.createElement('div')
  const mapId = `geospatialmap_${index}`

  mapContainer.setAttribute('id', mapId)
  mapContainer.setAttribute('class', 'map-container')

  const listContainer = document.createElement('div')
  const listId = `${mapId}_list`
  listContainer.setAttribute('id', listId)

  const value = geospatialInput.value.trim()
  const hasValue = !!value

  /** @type {FeatureCollection} */
  const features = hasValue ? JSON.parse(value) : []

  /** @type {GeoJSON} */
  const geojson = {
    type: 'FeatureCollection',
    features
  }

  const bounds = hasValue ? bbox(geojson) : undefined
  const drawPlugin = defra.drawMLPlugin()

  const initConfig = {
    ...defaultConfig,
    bounds,
    plugins: [drawPlugin]
  }

  geospatialInput.after(mapContainer)
  mapContainer.after(listContainer)
  geospatialInput.classList.add('js-hidden')

  const { map, interactPlugin } = createMap(mapId, initConfig, config)

  map.on(
    EVENTS.mapReady,
    /**
     * Callback function which fires when the map is ready
     */
    function onMapReady() {
      // Add info panel
      map.addPanel('info', {
        showLabel: true,
        label: 'How to use the map',
        mobile: {
          slot: 'bottom',
          open: true,
          dismissible: true,
          modal: false
        },
        tablet: {
          slot: 'bottom',
          open: true,
          dismissible: true,
          modal: false
        },
        desktop: {
          slot: 'bottom',
          open: true,
          dismissible: true,
          modal: false
        },
        html: 'Use the buttons below to add Points, Polygons and Lines to the map<br><br>To finish drawing a shape you can double-click or click the "Done" button.<br>Once added you can give each feature a name in the table below.'
      })

      map.addButton('btnAddPoint', {
        variant: 'tertiary',
        label: 'Add point',
        iconSvgContent:
          '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /> ',
        onClick: () => {
          resetActiveFeature()
          toggleActionButtons(true)
          interactPlugin.enable()
        },
        mobile: { slot: 'actions' },
        tablet: { slot: 'actions' },
        desktop: { slot: 'actions' }
      })

      map.addButton('btnAddPolygon', {
        variant: 'tertiary',
        label: 'Add polygon',
        iconSvgContent:
          '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
        onClick: () => {
          resetActiveFeature()
          toggleActionButtons(true)
          drawPlugin.newPolygon(generateID(), polygonFeatureProperties)
        },
        mobile: { slot: 'actions' },
        tablet: { slot: 'actions' },
        desktop: { slot: 'actions' }
      })

      map.addButton('btnAddLine', {
        variant: 'tertiary',
        label: 'Add line',
        iconSvgContent:
          '<path d="M5.706 16.294L16.294 5.706"/><path d="M21 2v3c0 .549-.451 1-1 1h-3c-.549 0-1-.451-1-1V2c0-.549.451-1 1-1h3c.549 0 1 .451 1 1zM6 17v3c0 .549-.451 1-1 1H2c-.549 0-1-.451-1-1v-3c0-.549.451-1 1-1h3c.549 0 1 .451 1 1z"/>',
        onClick: () => {
          resetActiveFeature()
          toggleActionButtons(true)
          drawPlugin.newLine(generateID(), lineFeatureProperties)
        },
        mobile: { slot: 'actions' },
        tablet: { slot: 'actions' },
        desktop: { slot: 'actions' }
      })
    }
  )

  /** @type {string | undefined} */
  let _activeFeature

  function resetActiveFeature() {
    _activeFeature = undefined
  }

  /**
   * Toggle the hidden state of the action buttons
   * @param {boolean} hidden - whether to hide the action buttons
   */
  function toggleActionButtons(hidden) {
    map.toggleButtonState('btnAddPoint', 'hidden', hidden)
    map.toggleButtonState('btnAddPolygon', 'hidden', hidden)
    map.toggleButtonState('btnAddLine', 'hidden', hidden)
  }

  /**
   * Set focus to the last description input
   */
  function focusDescriptionInput() {
    const inputs = listContainer.querySelectorAll('input')
    if (inputs.length) {
      const lastInput = /** @type {HTMLInputElement} */ inputs.item(
        inputs.length - 1
      )
      lastInput.focus()
      lastInput.select()
    }
  }

  /**
   * Removes a feature from the geojson
   * @param {string} id - the feature id
   */
  function removeFeature(id) {
    const idx = geojson.features.findIndex((f) => f.id === id)

    if (idx > -1) {
      geojson.features.splice(idx, 1)
      renderFeatures(
        geojson,
        listContainer,
        /** @type {HTMLTextAreaElement} */ (geospatialInput)
      )
    }
  }

  /**
   * Callback when the draw plugin is ready
   */
  function onDrawReady() {
    geojson.features.forEach((feature) => {
      switch (feature.geometry.type) {
        case 'Polygon':
          drawPlugin.addFeature({ ...feature, ...polygonFeatureProperties })
          break
        case 'LineString':
          drawPlugin.addFeature({ ...feature, ...lineFeatureProperties })
          break
        case 'Point':
          map.addMarker(feature.id, feature.geometry.coordinates)
          break
        default:
          break
      }
    })

    // Update the features
    renderFeatures(
      geojson,
      listContainer,
      /** @type {HTMLTextAreaElement} */ (geospatialInput)
    )
  }
  map.on(EVENTS.drawReady, onDrawReady)

  /**
   * Callback when a draw feature has been created
   * @param {Feature} e
   */
  function onDrawCreated(e) {
    // New feature
    const typeName = e.geometry.type === 'LineString' ? 'line' : 'polygon'

    const description = `New ${typeName}`

    geojson.features.push({
      ...e,
      properties: {
        description
      }
    })

    // Update the features
    renderFeatures(
      geojson,
      listContainer,
      /** @type {HTMLTextAreaElement} */ (geospatialInput)
    )
    toggleActionButtons(false)
    focusDescriptionInput()
  }
  map.on(EVENTS.drawCreated, onDrawCreated)

  /**
   * Callback when a draw feature has been edited
   * @param {{ id: string, geometry: Geometry }} e
   */
  function onDrawEdited(e) {
    const changedFeature = e
    const featureId = changedFeature.id
    const feature = geojson.features.find((f) => f.id === featureId)

    // Ensure the featureId exists in the geojson
    if (feature && _activeFeature === featureId) {
      feature.geometry = changedFeature.geometry

      // Update the features
      renderFeatures(
        geojson,
        listContainer,
        /** @type {HTMLTextAreaElement} */ (geospatialInput)
      )
    }

    resetActiveFeature()
  }
  map.on(EVENTS.drawEdited, onDrawEdited)

  /**
   * Callback when a draw feature has been cancelled
   */
  function onDrawCancelled() {
    toggleActionButtons(false)
  }
  map.on(EVENTS.drawCancelled, onDrawCancelled)

  /**
   * Callback when an interact marker has been changed
   * @param {{ coords: Coordinates }} e
   */
  function onInteractMarkerChange(e) {
    if (_activeFeature) {
      // Editing an existing point
      const feature = geojson.features.find((f) => f.id === _activeFeature)
      map.addMarker(_activeFeature, e.coords)

      if (feature) {
        feature.geometry.coordinates = e.coords

        // Update the features
        renderFeaturesValue(
          geojson,
          /** @type {HTMLTextAreaElement} */ (geospatialInput)
        )
      }

      resetActiveFeature()
    } else {
      // Adding a new point
      const id = generateID()
      const description = 'New point'

      geojson.features.push({
        type: 'Feature',
        properties: {
          description
        },
        geometry: {
          type: 'Point',
          coordinates: e.coords
        },
        id
      })
      map.addMarker(id, e.coords)

      // Update the features
      renderFeatures(
        geojson,
        listContainer,
        /** @type {HTMLTextAreaElement} */ (geospatialInput)
      )

      focusDescriptionInput()
    }
    map.removeMarker('location')

    interactPlugin.disable()
    toggleActionButtons(false)
  }
  map.on(EVENTS.interactMarkerChange, onInteractMarkerChange)

  listContainer.addEventListener(
    'click',
    /**
     * List container delegated 'click' events handler
     * @param {MouseEvent} e
     */
    function (e) {
      e.preventDefault()
      e.stopPropagation()

      const target = e.target
      if (!(target instanceof HTMLElement)) {
        return
      }

      if (
        target.tagName === 'A' &&
        target.dataset.action &&
        target.dataset.id
      ) {
        const { action, id, type } = target.dataset

        if (action === 'edit') {
          _activeFeature = id
          // "Change" feature link was clicked
          if (type === 'Point') {
            interactPlugin.selectFeature({ featureId: id })
            interactPlugin.enable()
          } else {
            drawPlugin.editFeature(id)
          }
          toggleActionButtons(true)
        }

        if (action === 'delete') {
          // "Remove" feature link was clicked
          if (type === 'Point') {
            map.removeMarker(id)
            removeFeature(id)
          } else {
            drawPlugin.deleteFeature(id)
            removeFeature(id)
          }
        }
      }
    },
    false
  )

  listContainer.addEventListener(
    'change',
    /**
     * List container delegated 'change' events handler
     * Used to update the description of features
     * @param {Event} e
     */
    function (e) {
      e.preventDefault()
      e.stopPropagation()

      const target = e.target
      if (!(target instanceof HTMLInputElement) || !target.dataset.id) {
        return
      }

      const { id } = target.dataset
      const feature = geojson.features.find((feature) => feature.id === id)

      if (feature) {
        feature.properties.description = target.value.trim()
        renderFeaturesValue(geojson, geospatialInput)
      }
    },
    false
  )
}

/**
 * Create a Defra map instance
 * @param {string} mapId - the map id
 * @param {InteractiveMapInitConfig} initConfig - the map initial configuration
 * @param {MapsEnvironmentConfig} mapsConfig - the map environment params
 */
function createMap(mapId, initConfig, mapsConfig) {
  const { assetPath, apiPath, data = defaultData } = mapsConfig
  const logoAltText = 'Ordnance survey logo'

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
        mapStyles: [
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
          }
        ]
      }),
      interactPlugin,
      defra.searchPlugin({
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
 * Updates the marker position and moves the map view port the new location
 * @param {InteractiveMap} map - the map component instance (of InteractiveMap)
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
 * Generate a random id
 */
function generateID() {
  return window.crypto.randomUUID()
}

/**
 * Render features into the list and hidden textarea
 * @param {GeoJSON} geojson - the geojson of features
 * @param {HTMLDivElement} listContainer - where to render the feature list
 * @param {HTMLTextAreaElement} geospatialInput - the geospatial textarea
 */
function renderFeatures(geojson, listContainer, geospatialInput) {
  const html = createFeaturesHTML(geojson.features)

  listContainer.innerHTML = html
  geospatialInput.value = JSON.stringify(geojson.features, null, 2)

  renderFeaturesValue(geojson, geospatialInput)
}

/**
 * Returns HTML summary list for the features
 * @param {FeatureCollection} features - the features
 */
function createFeaturesHTML(features) {
  return `<dl class="govuk-summary-list">
    ${features.map(createFeatureHTML).join('\n')}
  </dl>`
}

/**
 * Returns HTML summary row for an single feature
 * @param {Feature} feature - the geo feature
 */
function createFeatureHTML(feature) {
  const changeAction = () => `<li class="govuk-summary-list__actions-list-item">
  <a class="govuk-link govuk-link--no-visited-state" href="#" data-action="edit" data-id="${feature.id}"
    data-type="${feature.geometry.type}">Change<span class="govuk-visually-hidden"> feature</span></a>
</li>`

  const deleteAction = () => `<li class="govuk-summary-list__actions-list-item">
  <a class="govuk-link govuk-link--no-visited-state" href="#" data-action="delete" data-id="${feature.id}"
    data-type="${feature.geometry.type}">Delete<span class="govuk-visually-hidden"> feature</span></a>
</li>`

  return `<div class="govuk-summary-list__row">
  <dt class="govuk-summary-list__key">
    <input class="govuk-input govuk-!-width-two-thirds" type="text" id="description_${feature.id}"
      value="${feature.properties.description}" data-id="${feature.id}">
  </dt>
  <dd class="govuk-summary-list__actions">
    <ul class="govuk-summary-list__actions-list">
      ${changeAction()}
      ${deleteAction()}
    </ul>
  </dd>
</div>`
}

/**
 * Render features JSON into the hidden textarea
 * @param {GeoJSON} geojson - the features
 * @param {HTMLTextAreaElement} geospatialInput - the geospatial textarea
 */
function renderFeaturesValue(geojson, geospatialInput) {
  geospatialInput.value = JSON.stringify(geojson.features, null, 2)
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
 */

/**
 * @typedef {object} MapsEnvironmentConfig
 * @property {string} assetPath - the root asset path
 * @property {string} apiPath - the root API path
 * @property {TileData} data - the tile data config
 */

/**
 * @import { Geometry, FeatureCollection, Feature, Coordinates } from '~/src/server/plugins/engine/types.js'
 */

/**
 * @typedef {object} GeoJSON
 * @property {'FeatureCollection'} type - the GeoJSON type string
 * @property {FeatureCollection} features - the features
 */
