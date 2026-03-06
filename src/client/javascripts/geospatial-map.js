import { bbox } from '@turf/bbox'

import {
  EVENTS,
  createMap,
  defaultConfig
} from '~/src/client/javascripts/map.js'

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
      const feature = geojson.features.find((f) => f.id === id)

      if (feature) {
        feature.properties.description = target.value.trim()
        renderFeaturesValue(geojson, geospatialInput)
      }
    },
    false
  )
}

/**
 * @import { MapsEnvironmentConfig } from '~/src/client/javascripts/map.js'
 */

/**
 * @import { Geometry, FeatureCollection, Feature, Coordinates } from '~/src/server/plugins/engine/types.js'
 */

/**
 * @typedef {object} GeoJSON
 * @property {'FeatureCollection'} type - the GeoJSON type string
 * @property {FeatureCollection} features - the features
 */
