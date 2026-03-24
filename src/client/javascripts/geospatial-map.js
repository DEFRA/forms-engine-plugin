import { bbox } from '@turf/bbox'

import {
  EVENTS,
  createMap,
  defaultConfig,
  getCentroidGridRef,
  getCoordinateGridRef
} from '~/src/client/javascripts/map.js'
import { GeometryType } from '~/src/server/plugins/engine/types.js'

const helpPanelConfig = {
  showLabel: true,
  label: 'How to use this map',
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
  html: '<p class="govuk-body-s govuk-!-margin-bottom-2">You can add points, shapes or lines to the map.</p><ul class="govuk-list govuk-list--number govuk-body-s"><li>Search for a county, place or postcode</li><li>Use the + and - icons to zoom in and out</li><li>Add a point or click \'Done\' when you have finished drawing a line or shape</li><li>Give the location a name</li></ul>'
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
 * @type {Record<GeometryType.Point | GeometryType.LineString | GeometryType.Polygon, string>}
 */
const typeDescriptions = {
  Point: 'Point',
  LineString: 'Line',
  Polygon: 'Shape'
}

/**
 * Extract and parses the GeoJSON from the textarea
 * @param {HTMLTextAreaElement} geospatialInput - the textarea containing the geojson
 */
export function getGeoJSON(geospatialInput) {
  const value = geospatialInput.value.trim()
  const hasValue = !!value

  /** @type {FeatureCollection} */
  const features = hasValue ? JSON.parse(value) : []

  /** @type {GeoJSON} */
  const geojson = {
    type: 'FeatureCollection',
    features
  }

  return geojson
}

/**
 * Gets the bounding box covering a feature collection
 * @param {GeoJSON} geojson - the geojson
 */
export function getBoundingBox(geojson) {
  return bbox(geojson)
}

/**
 * Processes a geospatial field to add map capability
 * @param {MapsEnvironmentConfig} config - the geospatial field element
 * @param {Element} geospatial - the geospatial field element
 * @param {number} index - the 0-based index
 */
export function processGeospatial(config, geospatial, index) {
  // @ts-expect-error - Defra namespace currently comes from UMD support files
  const defra = window.defra

  if (!(geospatial instanceof HTMLDivElement)) {
    return
  }

  const geospatialInput = geospatial.querySelector('.govuk-textarea')
  if (!(geospatialInput instanceof HTMLTextAreaElement)) {
    return
  }

  const { listEl, mapId } = createContainers(geospatialInput, index)
  const geojson = getGeoJSON(geospatialInput)
  const bounds = geojson.features.length ? getBoundingBox(geojson) : undefined
  const drawPlugin = defra.drawMLPlugin()

  const initConfig = {
    ...defaultConfig,
    bounds,
    plugins: [drawPlugin]
  }

  const { map, interactPlugin } = createMap(mapId, initConfig, config)
  const featuresManager = getFeaturesManager(geojson)
  const activeFeatureManager = getActiveFeatureManager()
  const uiManager = getUIManager(geojson, map, mapId, listEl, geospatialInput)

  /**
   * @type {Context}
   */
  const context = {
    map,
    featuresManager,
    activeFeatureManager,
    uiManager,
    interactPlugin,
    drawPlugin
  }

  addEventListeners(context)
}

/**
 * Adds a feature to the map
 * @param {Feature} feature - the geojson feature
 * @param {any} drawPlugin - the map draw plugin
 * @param {InteractiveMap} map - the interactive map
 */
export function addFeatureToMap(feature, drawPlugin, map) {
  switch (feature.geometry.type) {
    case GeometryType.Polygon:
      drawPlugin.addFeature({ ...feature, ...polygonFeatureProperties })
      break
    case GeometryType.LineString:
      drawPlugin.addFeature({ ...feature, ...lineFeatureProperties })
      break
    case GeometryType.Point:
      map.addMarker(feature.id, feature.geometry.coordinates)
      break
    default:
      break
  }
}

/**
 * Returns HTML summary list for the features
 * @param {FeatureCollection} features - the features
 * @param {string} mapId - the ID of the map
 * @param {boolean} [readonly] - render the list in readonly mode
 */
export function createFeaturesHTML(features, mapId, readonly = false) {
  return `<dl class="govuk-summary-list">
    ${features.map((feature, index) => createFeatureHTML(feature, index, mapId, readonly)).join('\n')}
  </dl>`
}

/**
 * Focus feature
 * @param {Feature} feature - the feature
 * @param {MapLibreMap} mapProvider - the feature id
 */
export function focusFeature(feature, mapProvider) {
  mapProvider.fitBounds(bbox(feature))
}

/**
 * Returns HTML summary row for an single feature
 * @param {Feature} feature - the geo feature
 * @param {number} index - the feature index
 * @param {string} mapId - the ID of the map
 * @param {boolean} readonly - render the list item in readonly mode
 */
function createFeatureHTML(feature, index, mapId, readonly) {
  const flattened = feature.geometry.coordinates.flat(2)

  const points = []
  for (let i = 0; i < flattened.length; i += 2) {
    points.push(flattened.slice(i, i + 2).join(', '))
  }
  const coordinates = points.map((p) => `<li>${p}</li>`).join('')

  const description = readonly
    ? `<p class="govuk-body govuk-!-margin-bottom-0">${feature.properties.description}</p>`
    : `<input class="govuk-input govuk-!-width-two-thirds" type="text" id="description_${index}" value="${feature.properties.description}" data-id="${feature.id}">`

  // Change action link
  const changeAction = () => `<li class="govuk-summary-list__actions-list-item">
  <a class="govuk-link govuk-link--no-visited-state" href="#${mapId}" data-action="edit" data-id="${feature.id}"
    data-type="${feature.geometry.type}">Update<span class="govuk-visually-hidden"> location</span></a>
</li>`

  // Delete action link
  const deleteAction = () => `<li class="govuk-summary-list__actions-list-item">
  <a class="govuk-link govuk-link--no-visited-state" href="#" data-action="delete" data-id="${feature.id}"
    data-type="${feature.geometry.type}">Delete<span class="govuk-visually-hidden"> location</span></a>
</li>`

  // Focus action link
  const focusAction = () => `<li class="govuk-summary-list__actions-list-item">
  <a class="govuk-link govuk-link--no-visited-state" href="#${mapId}" data-action="focus" data-id="${feature.id}">Show<span class="govuk-visually-hidden"> location</span></a>
</li>`

  const links = readonly ? focusAction() : `${changeAction()}${deleteAction()}`

  const actions = `<ul class="govuk-summary-list__actions-list">${links}</ul>`

  return `<div class="govuk-summary-list__row govuk-summary-list__row--no-border">
  <dt class="govuk-summary-list__key">
    <div class="govuk-form-group">
      <label class="govuk-label govuk-label--s" ${readonly ? '' : `for="description_${index}"`}>Location ${index + 1} description</label>
      ${description}
    </div>
  </dt>
  <dd class="govuk-summary-list__actions">
    ${actions}
  </dd>
</div>
<div class="govuk-summary-list__row">
  <details class="govuk-details govuk-!-margin-bottom-2">
    <summary class="govuk-details__summary">
      <span class="govuk-details__summary-text">Coordinates</span>
    </summary>
    <div class="govuk-details__text">
      <dl class="govuk-summary-list">
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">Type</dt>
          <dd class="govuk-summary-list__value">${typeDescriptions[feature.geometry.type]}</dd>
        </div>
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">Center grid reference</dt>
          <dd class="govuk-summary-list__value">${feature.properties.centroidGridReference}</dd>
        </div>
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">First point grid reference</dt>
          <dd class="govuk-summary-list__value">${feature.properties.coordinateGridReference}</dd>
        </div>
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">Detailed coordinates</dt>
          <dd class="govuk-summary-list__value">
            <ol class="govuk-list govuk-list--number">${coordinates}</ol>
          </dd>
        </div>
      </dl>
    </div>
  </details>
</div>`
}

/**
 * Generate a random id
 */
function generateID() {
  return window.crypto.randomUUID()
}

/**
 * Factory closure to track the active feature id
 * @returns {ActiveFeatureManager}
 */
function getActiveFeatureManager() {
  /** @type {string | undefined} */
  let activeFeature

  /**
   * Returns the active feature id
   * @type {GetActiveFeature}
   */
  function getActiveFeature() {
    return activeFeature
  }

  /**
   * Sets the active feature id
   * @type {SetActiveFeature}
   */
  function setActiveFeature(id) {
    activeFeature = id
  }

  /**
   * Resets the active feature id
   * @type {ResetActiveFeature}
   */
  function resetActiveFeature() {
    activeFeature = undefined
  }

  return {
    getActiveFeature,
    setActiveFeature,
    resetActiveFeature
  }
}

/**
 * Reduce coordinate precision to 7 dps
 * @param {Feature} feature
 */
function prepareGeometry(feature) {
  const { geometry } = feature
  const maxPrecision = 7

  /**
   * @param {Coordinates} coordinates
   */
  function formatPrecision(coordinates) {
    coordinates[0] = +coordinates[0].toFixed(maxPrecision)
    coordinates[1] = +coordinates[1].toFixed(maxPrecision)
  }

  if (geometry.type === GeometryType.Point) {
    formatPrecision(geometry.coordinates)
  } else if (geometry.type === GeometryType.LineString) {
    geometry.coordinates.forEach(formatPrecision)
  } else {
    geometry.coordinates.flat().forEach(formatPrecision)
  }
}

/**
 * Factory closure to return a features manager
 * @param {GeoJSON} geojson
 * @returns {FeaturesManager}
 */
function getFeaturesManager(geojson) {
  /**
   * Get a feature from the geojson by id
   * @type {GetFeatures}
   */
  function getFeatures() {
    return geojson.features
  }

  /**
   * Get a feature from the geojson by id
   * @type {GetFeature}
   */
  function getFeature(id) {
    return geojson.features.find((f) => f.id === id)
  }

  /**
   * Add a feature to the geojson
   * @type {AddFeature}
   */
  function addFeature(feature) {
    feature.properties.coordinateGridReference = getCoordinateGridRef(feature)
    feature.properties.centroidGridReference = getCentroidGridRef(feature)
    prepareGeometry(feature)

    geojson.features.push(feature)
  }

  /**
   * Updates a feature in the geojson
   * @type {UpdateFeature}
   */
  function updateFeature(id, geometry) {
    const feature = getFeature(id)

    // Ensure the feature exists in the geojson
    if (feature) {
      feature.properties.coordinateGridReference = getCoordinateGridRef(feature)
      feature.properties.centroidGridReference = getCentroidGridRef(feature)
      feature.geometry = geometry
      prepareGeometry(feature)
    }

    return feature
  }

  /**
   * Removes a feature from the geojson
   * @type {RemoveFeature}
   */
  function removeFeature(id) {
    const idx = geojson.features.findIndex((f) => f.id === id)

    return idx > -1 ? geojson.features.splice(idx, 1) : undefined
  }

  return {
    getFeatures,
    getFeature,
    addFeature,
    updateFeature,
    removeFeature
  }
}

/**
 * Factory to render features into the list and hidden textarea
 * @param {GeoJSON} geojson - the geojson of features
 * @param {string} mapId - the ID of the map
 * @param {HTMLDivElement} listEl - where to render the feature list
 * @param {Function} renderValue - function that renders the features JSON into the hidden textarea
 * @returns {RenderList}
 */
function getListRenderer(geojson, mapId, listEl, renderValue) {
  return function renderList() {
    const html = createFeaturesHTML(geojson.features, mapId)

    listEl.innerHTML = html

    renderValue()
  }
}

/**
 * Factory to render features JSON into the hidden textarea
 * @param {GeoJSON} geojson - the features
 * @param {HTMLTextAreaElement} geospatialInput - the geospatial textarea
 * @returns {RenderValue}
 */
function getValueRenderer(geojson, geospatialInput) {
  return function renderValue() {
    geospatialInput.value = JSON.stringify(geojson.features, null, 2)
  }
}

/**
 * Factory closure to manage the UI
 * @param {GeoJSON} geojson - the features
 * @param {InteractiveMap} map - the map
 * @param {string} mapId - the ID of the map
 * @param {HTMLDivElement} listEl - where to render the feature list
 * @param {HTMLTextAreaElement} geospatialInput - the geospatial textarea
 */
function getUIManager(geojson, map, mapId, listEl, geospatialInput) {
  /**
   * Toggle the hidden state of the action buttons
   * @type {ToggleActionButtons}
   */
  function toggleActionButtons(hidden) {
    map.toggleButtonState('btnAddPoint', 'hidden', hidden)
    map.toggleButtonState('btnAddPolygon', 'hidden', hidden)
    map.toggleButtonState('btnAddLine', 'hidden', hidden)
  }

  /**
   * Set focus to the last description input
   * @type {FocusDescriptionInput}
   */
  function focusDescriptionInput() {
    const inputs = listEl.querySelectorAll('input')
    if (inputs.length) {
      const lastInput = /** @type {HTMLInputElement} */ inputs.item(
        inputs.length - 1
      )
      lastInput.focus()
      lastInput.select()
    }
  }

  const renderValue = getValueRenderer(geojson, geospatialInput)
  const renderList = getListRenderer(geojson, mapId, listEl, renderValue)

  /** @type {UIManager} */
  return {
    renderList,
    renderValue,
    listEl,
    toggleActionButtons,
    focusDescriptionInput
  }
}

/**
 * Setup the UI event listeners
 * @param {Context} context - the context
 */
function addEventListeners(context) {
  const { map } = context

  map.on(EVENTS.mapReady, onMapReadyFactory(context))
}

/**
 * Create the map and list containers and adds them to the DOM
 * @param {HTMLTextAreaElement} geospatialInput - the textarea containing the geojson
 * @param {number} index - the 0 based index
 */
function createContainers(geospatialInput, index) {
  const mapEl = document.createElement('div')
  const mapId = `geospatialmap_${index}`

  mapEl.setAttribute('id', mapId)
  mapEl.setAttribute('class', 'map-container')

  const listEl = document.createElement('div')
  const listId = `${mapId}_list`
  listEl.setAttribute('id', listId)

  geospatialInput.after(mapEl)
  mapEl.after(listEl)
  geospatialInput.classList.add('js-hidden')

  return { mapEl, listEl, mapId }
}

/**
 * Callback factory function which fires when the map is ready
 * @param {Context} context - the UI context
 */
function onMapReadyFactory(context) {
  const { map, activeFeatureManager, uiManager, interactPlugin, drawPlugin } =
    context
  const { toggleActionButtons } = uiManager
  const { resetActiveFeature } = activeFeatureManager

  /**
   * Callback function which fires when the map is ready
   * @param {object} e - the event
   * @param {MapLibreMap} e.map - the map provider instance
   */
  return function onMapReady(e) {
    // Add info panel
    map.addPanel('info', helpPanelConfig)

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
      label: 'Add shape',
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

    // Set the map provider on the context
    context.mapProvider = e.map

    map.on(EVENTS.drawReady, onDrawReadyFactory(context))
    map.on(EVENTS.drawCreated, onDrawCreatedFactory(context))
    map.on(EVENTS.drawEdited, onDrawEditedFactory(context))
    map.on(EVENTS.drawCancelled, onDrawCancelledFactory(context))
    map.on(EVENTS.interactMarkerChange, onInteractMarkerChangedFactory(context))

    const { listEl } = uiManager
    listEl.addEventListener('click', onListElClickFactory(context), false)
    listEl.addEventListener('change', onListElChangeFactory(context), false)
  }
}

/**
 * Callback factory function which fires when the map draw plugin is ready
 * @param {Context} context - the UI context
 */
function onDrawReadyFactory(context) {
  const { featuresManager, uiManager, drawPlugin, map } = context
  const { renderList } = uiManager
  const { getFeatures } = featuresManager

  /**
   * Callback when the draw plugin is ready
   */
  return function onDrawReady() {
    getFeatures().forEach((feature) =>
      addFeatureToMap(feature, drawPlugin, map)
    )

    // Update the features
    renderList()
  }
}

/**
 * Callback factory function which fires when the map draw plugin creates a new feature
 * @param {Context} context - the UI context
 */
function onDrawCreatedFactory(context) {
  const { featuresManager, uiManager } = context
  const { addFeature } = featuresManager
  const { renderList, toggleActionButtons, focusDescriptionInput } = uiManager

  /**
   * Callback when a draw feature has been created
   * @param {Feature} e
   */
  return function onDrawCreated(e) {
    // New feature
    addFeature({
      ...e,
      properties: {
        description: ''
      }
    })

    // Update the features
    renderList()
    toggleActionButtons(false)
    focusDescriptionInput()
  }
}

/**
 * Callback factory function which fires when the map draw plugin edits a feature
 * @param {Context} context - the UI context
 */
function onDrawEditedFactory(context) {
  const { featuresManager, activeFeatureManager, uiManager } = context
  const { updateFeature } = featuresManager
  const { getActiveFeature, resetActiveFeature } = activeFeatureManager
  const { renderList, toggleActionButtons } = uiManager

  /**
   * Callback when a draw feature has been edited
   * @param {{ id: string, geometry: Geometry }} e
   */
  return function onDrawEdited(e) {
    const changedFeature = e
    const featureId = changedFeature.id

    if (getActiveFeature() === featureId) {
      updateFeature(featureId, changedFeature.geometry)

      // Update the features
      renderList()
    }

    resetActiveFeature()
    toggleActionButtons(false)
  }
}

/**
 * Callback factory function which fires when the map draw plugin cancels the editing of a feature
 * @param {Context} context - the UI context
 */
function onDrawCancelledFactory(context) {
  const { uiManager, activeFeatureManager } = context
  const { toggleActionButtons } = uiManager
  const { resetActiveFeature } = activeFeatureManager

  /**
   * Callback when a draw feature has been cancelled
   */
  return function onDrawCancelled() {
    toggleActionButtons(false)
    resetActiveFeature()
  }
}

/**
 * Callback factory function that fires when an interact marker has been changed
 * @param {Context} context - the UI context
 */
function onInteractMarkerChangedFactory(context) {
  const {
    featuresManager,
    activeFeatureManager,
    map,
    interactPlugin,
    uiManager
  } = context
  const { addFeature, updateFeature } = featuresManager
  const { getActiveFeature, resetActiveFeature } = activeFeatureManager
  const { renderList, focusDescriptionInput, toggleActionButtons } = uiManager

  /**
   * Callback when an interact marker has been changed
   * @param {{ coords: Coordinates }} e
   */
  return function onInteractMarkerChange(e) {
    const activeFeatureId = getActiveFeature()

    if (activeFeatureId) {
      // Editing an existing point
      const feature = updateFeature(activeFeatureId, {
        type: GeometryType.Point,
        coordinates: e.coords
      })

      map.addMarker(activeFeatureId, e.coords)

      if (feature) {
        // Update the features
        renderList()
      }

      resetActiveFeature()
    } else {
      // Adding a new point
      const id = generateID()
      addFeature({
        type: 'Feature',
        properties: {
          description: ''
        },
        geometry: {
          type: GeometryType.Point,
          coordinates: e.coords
        },
        id
      })

      map.addMarker(id, e.coords)

      // Update the features
      renderList()

      focusDescriptionInput()
    }
    map.removeMarker('location')

    interactPlugin.disable()
    toggleActionButtons(false)
  }
}

/**
 * Callback factory function that fires a 'click' event is fired on the list container
 * @param {Context} context - the UI context
 */
function onListElClickFactory(context) {
  const {
    map,
    mapProvider,
    featuresManager,
    activeFeatureManager,
    interactPlugin,
    uiManager,
    drawPlugin
  } = context
  const { getFeature, removeFeature } = featuresManager
  const { getActiveFeature, setActiveFeature } = activeFeatureManager
  const { renderList, toggleActionButtons } = uiManager

  /**
   * Delete a feature
   * @param {string} id - the feature id
   * @param {GeometryType} type - the feature type
   */
  function deleteFeature(id, type) {
    if (type === GeometryType.Point) {
      map.removeMarker(id)
      removeFeature(id)
    } else {
      drawPlugin.deleteFeature(id)
      removeFeature(id)
    }

    renderList()
  }

  /**
   * Start editing feature
   * @param {string} id - the feature id
   * @param {GeometryType} type - the feature type
   */
  function editFeature(id, type) {
    setActiveFeature(id)

    // "Change" feature link was clicked
    if (type === GeometryType.Point) {
      interactPlugin.selectFeature({ featureId: id })
      interactPlugin.enable()
    } else {
      drawPlugin.editFeature(id)
    }

    const feature = getFeature(id)
    if (feature && mapProvider) {
      focusFeature(feature, mapProvider)
    }

    toggleActionButtons(true)
  }

  /**
   * List container delegated 'click' events handler
   * @param {MouseEvent} e
   */
  return function (e) {
    const target = e.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    if (getActiveFeature()) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (
      target.tagName === 'A' &&
      target.dataset.action &&
      target.dataset.id &&
      target.dataset.type
    ) {
      const { action, id, type } = target.dataset

      if (action === 'edit') {
        // "Update" feature link was clicked
        editFeature(id, /** @type {GeometryType} */ (type))
      } else {
        e.preventDefault()
        e.stopPropagation()

        if (action === 'delete') {
          // "Remove" feature link was clicked
          deleteFeature(id, /** @type {GeometryType} */ (type))
        }
      }
    }
  }
}

/**
 * Callback factory function that fires a 'change' event is fired on the list container
 * @param {Context} context - the UI context
 */
function onListElChangeFactory(context) {
  const { featuresManager, uiManager } = context
  const { getFeature } = featuresManager
  const { renderValue } = uiManager

  /**
   * List container delegated 'change' events handler
   * Used to update the description of features
   * @param {Event} e
   */
  return function (e) {
    e.preventDefault()
    e.stopPropagation()

    const target = e.target
    if (!(target instanceof HTMLInputElement) || !target.dataset.id) {
      return
    }

    const { id } = target.dataset
    const feature = getFeature(id)

    if (feature) {
      feature.properties.description = target.value.trim()
      renderValue()
    }
  }
}

/**
 * @import { MapsEnvironmentConfig, InteractiveMap } from '~/src/client/javascripts/map.js'
 */

/**
 * @import { Geometry, FeatureCollection, Feature, Coordinates } from '~/src/server/plugins/engine/types.js'
 */

/**
 * @typedef {object} GeoJSON
 * @property {'FeatureCollection'} type - the GeoJSON type string
 * @property {FeatureCollection} features - the features
 */

/**
 * Gets all the features
 * @callback GetFeatures
 * @returns {FeatureCollection}
 */

/**
 * Gets a feature from the geojson by id
 * @callback GetFeature
 * @param {string} id - the feature id
 * @returns {Feature | undefined}
 */

/**
 * Add a feature to the geojson
 * @callback AddFeature
 * @param {Feature} feature - the feature to add
 */

/**
 * Update a feature in the geojson
 * @callback UpdateFeature
 * @param {string} id - the feature id
 * @param {Geometry} geometry - the feature geometry
 * @returns {Feature | undefined}
 */

/**
 * Removes a feature from the geojson
 * @callback RemoveFeature
 * @param {string} id - the feature id
 */

/**
 * Gets the active feature id
 * @callback GetActiveFeature
 * @returns {string | undefined}
 */

/**
 * Set the active feature id
 * @callback SetActiveFeature
 * @param {string} id - the feature id
 * @returns {void}
 */

/**
 * Resets the active feature id
 * @callback ResetActiveFeature
 * @returns {void}
 */

/**
 * Renders the features into the list
 * @callback RenderList
 * @returns {void}
 */

/**
 * Renders the features JSON into the hidden textarea
 * @callback RenderValue
 * @returns {void}
 */

/**
 * Toggles the action button hidden state
 * @callback ToggleActionButtons
 * @param {boolean} hidden - whether to hide the action buttons
 * @returns {void}
 */

/**
 * Set focus to the last description input
 * @callback FocusDescriptionInput
 * @returns {void}
 */

/**
 * @typedef {object} FeaturesManager
 * @property {GetFeatures} getFeatures - function that gets all the features
 * @property {GetFeature} getFeature - function that gets a feature from the geojson
 * @property {AddFeature} addFeature - function that adds feature to the geojson
 * @property {UpdateFeature} updateFeature - function that updates a feature in the geojson
 * @property {RemoveFeature} removeFeature - function that removes a feature from the geojson
 */

/**
 * @typedef {object} ActiveFeatureManager
 * @property {GetActiveFeature} getActiveFeature - function that returns the current active feature id
 * @property {SetActiveFeature} setActiveFeature - function that sets the current active feature id
 * @property {ResetActiveFeature} resetActiveFeature - function that resets the current active feature id
 */

/**
 * @typedef {object} UIManager
 * @property {RenderValue} renderValue - function that renders the features JSON into the hidden textarea
 * @property {RenderList} renderList - function that renders the features into the list
 * @property {HTMLDivElement} listEl - the summary list of features
 * @property {ToggleActionButtons} toggleActionButtons - function that toggles the action buttons
 * @property {FocusDescriptionInput} focusDescriptionInput - function that sets focus to a description input element
 */

/**
 * @typedef {object} Context
 * @property {InteractiveMap} map - the interactive map
 * @property {MapLibreMap} [mapProvider] - the interactive map provider
 * @property {FeaturesManager} featuresManager - the features manager
 * @property {ActiveFeatureManager} activeFeatureManager - the active feature manager
 * @property {UIManager} uiManager - the UI manager
 * @property {any} interactPlugin - the map interact plugin
 * @property {any} drawPlugin - the map draw plugin
 */

/**
 * @import { MapLibreMap } from '~/src/client/javascripts/map.js'
 */
