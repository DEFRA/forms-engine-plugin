import { bbox } from '@turf/bbox'

import {
  EVENTS,
  createMap,
  defaultConfig,
  getGridRef
} from '~/src/client/javascripts/map.js'

const helpPanelConfig = {
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
  html: 'Use the buttons below to add points, shapes and lines to the map<br><br>To finish drawing a line or shape you can double-click or click the "Done" button.<br>Once added you can give each feature a name in the table below.'
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
 * Factory closure to track the active feature id
 */
function trackActiveFeature() {
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

  const { listContainer, mapId } = createContainers(geospatialInput, index)
  const { hasValue, geojson } = getGeoJSON(geospatialInput)
  const bounds = hasValue ? bbox(geojson) : undefined
  const drawPlugin = defra.drawMLPlugin()

  const initConfig = {
    ...defaultConfig,
    bounds,
    plugins: [drawPlugin]
  }

  const { map, interactPlugin } = createMap(mapId, initConfig, config)
  const { getActiveFeature, setActiveFeature, resetActiveFeature } =
    trackActiveFeature()

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
    feature.properties.gridReference = getGridRef(feature)

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
      feature.properties.gridReference = getGridRef(feature)
      feature.geometry = geometry
    }

    return feature
  }

  /**
   * Removes a feature from the geojson
   * @type {RemoveFeature}
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
   * @type {Context}
   */
  const context = {
    map,
    geojson,
    getFeature,
    addFeature,
    updateFeature,
    removeFeature,
    interactPlugin,
    drawPlugin,
    geospatialInput,
    listContainer,
    getActiveFeature,
    setActiveFeature,
    resetActiveFeature,
    toggleActionButtons,
    focusDescriptionInput
  }

  addEventListeners(context)
}

/**
 * Setup the UI event listeners
 * @param {Context} context - the context
 */
function addEventListeners(context) {
  const { map, listContainer } = context

  map.on(EVENTS.mapReady, onMapReadyFactory(context))
  map.on(EVENTS.drawReady, onDrawReadyFactory(context))
  map.on(EVENTS.drawCreated, onDrawCreatedFactory(context))
  map.on(EVENTS.drawEdited, onDrawEditedFactory(context))
  map.on(EVENTS.drawCancelled, onDrawCancelledFactory(context))
  map.on(EVENTS.interactMarkerChange, onInteractMarkerChangedFactory(context))

  listContainer.addEventListener(
    'click',
    onListContainerClickFactory(context),
    false
  )

  listContainer.addEventListener(
    'change',
    onListContainerChangeFactory(context),
    false
  )
}

/**
 * Extract and parses the GeoJSON from the textarea
 * @param {HTMLTextAreaElement} geospatialInput - the textarea containing the geojson
 * @returns
 */
function getGeoJSON(geospatialInput) {
  const value = geospatialInput.value.trim()
  const hasValue = !!value

  /** @type {FeatureCollection} */
  const features = hasValue ? JSON.parse(value) : []

  /** @type {GeoJSON} */
  const geojson = {
    type: 'FeatureCollection',
    features
  }

  return { hasValue, geojson }
}

/**
 * Create the map and list containers and adds them to the DOM
 * @param {HTMLTextAreaElement} geospatialInput - the textarea containing the geojson
 * @param {number} index - the 0 based index
 */
function createContainers(geospatialInput, index) {
  const mapContainer = document.createElement('div')
  const mapId = `geospatialmap_${index}`

  mapContainer.setAttribute('id', mapId)
  mapContainer.setAttribute('class', 'map-container')

  const listContainer = document.createElement('div')
  const listId = `${mapId}_list`
  listContainer.setAttribute('id', listId)

  geospatialInput.after(mapContainer)
  mapContainer.after(listContainer)
  geospatialInput.classList.add('js-hidden')

  return { mapContainer, listContainer, mapId }
}

/**
 * Callback factory function which fires when the map is ready
 * @param {Context} context - the UI context
 */
function onMapReadyFactory(context) {
  const {
    map,
    resetActiveFeature,
    toggleActionButtons,
    interactPlugin,
    drawPlugin
  } = context

  /**
   * Callback function which fires when the map is ready
   */
  return function onMapReady() {
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
  }
}

/**
 * Callback factory function which fires when the map draw plugin is ready
 * @param {Context} context - the UI context
 */
function onDrawReadyFactory(context) {
  const { geojson, drawPlugin, map, listContainer, geospatialInput } = context

  /**
   * Callback when the draw plugin is ready
   */
  return function onDrawReady() {
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
}

/**
 * Callback factory function which fires when the map draw plugin creates a new feature
 * @param {Context} context - the UI context
 */
function onDrawCreatedFactory(context) {
  const {
    geojson,
    addFeature,
    listContainer,
    geospatialInput,
    toggleActionButtons,
    focusDescriptionInput
  } = context

  /**
   * Callback when a draw feature has been created
   * @param {Feature} e
   */
  return function onDrawCreated(e) {
    // New feature
    const typeName = e.geometry.type === 'LineString' ? 'line' : 'shape'

    const description = `New ${typeName}`

    addFeature({
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
}

/**
 * Callback factory function which fires when the map draw plugin edits a feature
 * @param {Context} context - the UI context
 */
function onDrawEditedFactory(context) {
  const {
    geojson,
    updateFeature,
    getActiveFeature,
    listContainer,
    geospatialInput,
    resetActiveFeature,
    toggleActionButtons
  } = context

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
      renderFeatures(
        geojson,
        listContainer,
        /** @type {HTMLTextAreaElement} */ (geospatialInput)
      )
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
  const { toggleActionButtons } = context

  /**
   * Callback when a draw feature has been cancelled
   */
  return function onDrawCancelled() {
    toggleActionButtons(false)
  }
}

/**
 * Callback factory function that fires when an interact marker has been changed
 * @param {Context} context - the UI context
 */
function onInteractMarkerChangedFactory(context) {
  const {
    getActiveFeature,
    geojson,
    addFeature,
    updateFeature,
    map,
    geospatialInput,
    resetActiveFeature,
    listContainer,
    focusDescriptionInput,
    interactPlugin,
    toggleActionButtons
  } = context

  /**
   * Callback when an interact marker has been changed
   * @param {{ coords: Coordinates }} e
   */
  return function onInteractMarkerChange(e) {
    const activeFeatureId = getActiveFeature()

    if (activeFeatureId) {
      // Editing an existing point
      const feature = updateFeature(activeFeatureId, {
        type: 'Point',
        coordinates: e.coords
      })

      map.addMarker(activeFeatureId, e.coords)

      if (feature) {
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

      addFeature({
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
}

/**
 * Callback factory function that fires a 'click' event is fired on the list container
 * @param {Context} context - the UI context
 */
function onListContainerClickFactory(context) {
  const {
    map,
    removeFeature,
    setActiveFeature,
    interactPlugin,
    toggleActionButtons,
    drawPlugin
  } = context

  /**
   * List container delegated 'click' events handler
   * @param {MouseEvent} e
   */
  return function (e) {
    e.preventDefault()
    e.stopPropagation()

    const target = e.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    if (target.tagName === 'A' && target.dataset.action && target.dataset.id) {
      const { action, id, type } = target.dataset

      if (action === 'edit') {
        setActiveFeature(id)

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
  }
}

/**
 * Callback factory function that fires a 'change' event is fired on the list container
 * @param {Context} context - the UI context
 */
function onListContainerChangeFactory(context) {
  const { geojson, getFeature, geospatialInput } = context

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
      renderFeaturesValue(geojson, geospatialInput)
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
 * @typedef {object} Context
 * @property {InteractiveMap} map - the interactive map
 * @property {GeoJSON} geojson - the geojson features collection
 * @property {GetFeature} getFeature - function that gets a feature from the geojson
 * @property {AddFeature} addFeature - function that adds feature to the geojson
 * @property {UpdateFeature} updateFeature - function that updates a feature in the geojson
 * @property {RemoveFeature} removeFeature - function that removes a feature from the geojson
 * @property {any} interactPlugin - the map interact plugin
 * @property {any} drawPlugin - the map draw plugin
 * @property {HTMLTextAreaElement} geospatialInput - the hidden geospatial textarea input
 * @property {HTMLDivElement} listContainer - the summary list of features
 * @property {GetActiveFeature} getActiveFeature - function that returns the current active feature id
 * @property {SetActiveFeature} setActiveFeature - function that sets the current active feature id
 * @property {ResetActiveFeature} resetActiveFeature - function that resets the current active feature id
 * @property {ToggleActionButtons} toggleActionButtons - function that toggles the action buttons
 * @property {FocusDescriptionInput} focusDescriptionInput - function that sets focus to a description input element
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
