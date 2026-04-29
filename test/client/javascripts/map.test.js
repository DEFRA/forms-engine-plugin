import {
  createFeatureHTML,
  createFeaturesHTML
} from '~/src/client/javascripts/geospatial-map.js'
import {
  formSubmitFactory,
  getCentroidGridRef,
  getCoordinateGridRef,
  initMaps,
  makeTileRequestTransformer,
  transformGeocodeRequest
} from '~/src/client/javascripts/map.js'

describe('Maps Client JS', () => {
  /** @type {jest.Mock} */
  let onMock

  /** @type {jest.Mock} */
  let addMarkerMock

  /** @type {jest.Mock} */
  let removeMarkerMock

  /** @type {jest.Mock} */
  let addPanelMock

  /** @type {jest.Mock} */
  let addButtonMock

  /** @type {jest.Mock} */
  let interactPlugin

  /** @type {jest.Mock} */
  let interactPluginSelectFeature

  /** @type {jest.Mock} */
  let interactPluginEnable

  /** @type {jest.Mock} */
  let interactPluginDisable

  /** @type {jest.Mock} */
  let drawMLPlugin

  /** @type {jest.Mock} */
  let drawPluginAddFeature

  /** @type {jest.Mock} */
  let drawPluginEditFeature

  /** @type {jest.Mock} */
  let drawPluginNewPolygon

  /** @type {jest.Mock} */
  let drawPluginNewLine

  /** @type {jest.Mock} */
  let drawPluginDeleteFeature

  /** @type {jest.Mock} */
  let toggleButtonStateMock

  /** @type {jest.Mock} */
  let datasetsMaplibrePlugin

  beforeEach(() => {
    jest.resetAllMocks()

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noop = () => {}
    onMock = jest.fn()
    addMarkerMock = jest.fn()
    removeMarkerMock = jest.fn()
    addPanelMock = jest.fn()
    addButtonMock = jest.fn()
    toggleButtonStateMock = jest.fn()
    interactPluginSelectFeature = jest.fn()
    interactPluginEnable = jest.fn()
    interactPluginDisable = jest.fn()
    drawPluginAddFeature = jest.fn()
    drawPluginEditFeature = jest.fn()
    drawPluginDeleteFeature = jest.fn()
    drawPluginNewPolygon = jest.fn()
    drawPluginNewLine = jest.fn()
    interactPlugin = jest.fn(() => ({
      selectFeature: interactPluginSelectFeature,
      enable: interactPluginEnable,
      disable: interactPluginDisable
    }))
    drawMLPlugin = jest.fn(() => ({
      addFeature: drawPluginAddFeature,
      editFeature: drawPluginEditFeature,
      deleteFeature: drawPluginDeleteFeature,
      newPolygon: drawPluginNewPolygon,
      newLine: drawPluginNewLine
    }))
    datasetsMaplibrePlugin = jest.fn()

    class MockInteractiveMap {
      on = onMock
      addMarker = addMarkerMock
      removeMarker = removeMarkerMock
      addPanel = addPanelMock
      addButton = addButtonMock
      toggleButtonState = toggleButtonStateMock
    }

    // @ts-expect-error - loaded via UMD
    window.defra = {
      InteractiveMap: MockInteractiveMap,
      maplibreProvider: noop,
      openNamesProvider: noop,
      mapStylesPlugin: noop,
      interactPlugin,
      searchPlugin: noop,
      zoomControlsPlugin: noop,
      scaleBarPlugin: noop,
      drawMLPlugin,
      datasetsMaplibrePlugin
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Lat long component', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form method="post" novalidate="">
          <div class="govuk-form-group app-location-field " data-locationtype="latlongfield">
            <fieldset class="govuk-fieldset" aria-describedby="cbkDgE-hint">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--l">
                What is your latitude and longitude (optional)
              </legend>
              <div id="cbkDgE-hint" class="govuk-hint">
                For Great Britain, the latitude will be a number between 49.850 and 60.859. The longitude will be a number between -13.687 and 1.767
              </div>
              <div class="govuk-grid-row app-location-field-inputs">
                <div class="govuk-grid-column-one-third">
                  <div class="govuk-form-group">
                    <label class="govuk-label" for="cbkDgE__latitude">Latitude</label>
                    <div class="govuk-input__wrapper">
                      <input class="govuk-input govuk-input--width-10" id="cbkDgE__latitude" name="cbkDgE__latitude" type="text" inputmode="text">
                      <div class="govuk-input__suffix" aria-hidden="true">°</div>
                    </div>
                  </div>
                </div>
                <div class="govuk-grid-column-one-third">
                  <div class="govuk-form-group">
                    <label class="govuk-label" for="cbkDgE__longitude">
                      Longitude
                    </label>
                    <div class="govuk-input__wrapper">
                      <input class="govuk-input govuk-input--width-10" id="cbkDgE__longitude" name="cbkDgE__longitude" type="text" inputmode="text">
                      <div class="govuk-input__suffix" aria-hidden="true">°</div>
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div class="govuk-button-group">
            <button type="submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">Continue</button>
          </div>
        </form>
      `
    })

    describe('Map initialisation', () => {
      test('initMaps initializes without errors when DOM elements are present', () => {
        expect(() => initMaps()).not.toThrow()
        expect(onMock).toHaveBeenLastCalledWith(
          'map:ready',
          expect.any(Function)
        )

        const onMapReady = onMock.mock.calls[0][1]
        expect(typeof onMapReady).toBe('function')

        // Manually invoke onMapReady callback
        const flyToMock = jest.fn()
        onMapReady({
          map: {
            flyTo: flyToMock
          }
        })

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(interactPluginEnable).toHaveBeenCalled()

        expect(onMock).toHaveBeenLastCalledWith(
          'interact:markerchange',
          expect.any(Function)
        )

        const inputs = document.body.querySelectorAll('input.govuk-input')
        expect(inputs).toHaveLength(2)

        const latInput = /** @type {HTMLInputElement} */ (inputs[0])
        const longInput = /** @type {HTMLInputElement} */ (inputs[1])

        latInput.value = '53.825564'
        latInput.dispatchEvent(new window.Event('change'))

        longInput.value = '-2.421975'
        longInput.dispatchEvent(new window.Event('change'))

        // Expect it to update once, only when both fields are valid
        expect(addMarkerMock).toHaveBeenCalledTimes(1)
        expect(flyToMock).toHaveBeenCalledTimes(1)

        const onInteractMarkerChange = onMock.mock.calls[1][1]
        expect(typeof onInteractMarkerChange).toBe('function')
        onInteractMarkerChange({ coords: [-2.1478238, 54.155676] })
      })

      test('initMaps with initial values', () => {
        const inputs = document.body.querySelectorAll('input.govuk-input')
        expect(inputs).toHaveLength(2)

        const latInput = /** @type {HTMLInputElement} */ (inputs[0])
        const longInput = /** @type {HTMLInputElement} */ (inputs[1])

        // Set some initial values prior to initMaps
        latInput.value = '53.743697'
        longInput.value = '-1.522781'

        expect(() => initMaps()).not.toThrow()
        expect(onMock).toHaveBeenLastCalledWith(
          'map:ready',
          expect.any(Function)
        )

        const onMapReady = onMock.mock.calls[0][1]
        expect(typeof onMapReady).toBe('function')

        // Manually invoke onMapReady callback
        const flyToMock = jest.fn()
        onMapReady({
          map: {
            flyTo: flyToMock
          }
        })

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(interactPluginEnable).toHaveBeenCalled()

        expect(onMock).toHaveBeenLastCalledWith(
          'interact:markerchange',
          expect.any(Function)
        )

        latInput.value = '53.825564'
        latInput.dispatchEvent(new window.Event('change'))

        longInput.value = '-2.421975'
        longInput.dispatchEvent(new window.Event('change'))

        // Expect it to update twice as both fields are already valid
        expect(addMarkerMock).toHaveBeenCalledTimes(2)
        expect(flyToMock).toHaveBeenCalledTimes(2)
      })

      test('initMaps only applies when there are location components on the page', () => {
        const locations = document.querySelectorAll('.app-location-field')

        // Remove any locations for the test
        locations.forEach((location) => {
          location.remove()
        })

        expect(() => initMaps()).not.toThrow()
        expect(onMock).not.toHaveBeenCalled()
      })

      test('initMaps only applies when there are supported location components on the page', () => {
        const locations = document.querySelectorAll('.app-location-field')

        // Reset the location type of each component
        locations.forEach((location) => {
          location.setAttribute('data-locationtype', 'unknowntype')
        })

        expect(() => initMaps()).not.toThrow()
        expect(onMock).not.toHaveBeenCalled()
      })
    })
  })

  describe('Easting northing component', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form method="post" novalidate="">
          <div class="govuk-form-group app-location-field " data-locationtype="eastingnorthingfield">
            <fieldset class="govuk-fieldset" aria-describedby="cbkDgE-hint">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--l">
                What is your easting and northing
              </legend>
              <div id="cbkDgE-hint" class="govuk-hint">
                For example. Easting: 248741, Northing: 63688
              </div>
              <div class="govuk-grid-row app-location-field-inputs">
                <div class="govuk-grid-column-one-third">
                  <div class="govuk-form-group">
                    <label class="govuk-label" for="cbkDgE__easting">Easting</label>
                    <div class="govuk-input__wrapper">
                      <input class="govuk-input govuk-input--width-10" id="cbkDgE__easting" name="cbkDgE__easting" type="text" inputmode="text">
                    </div>
                  </div>
                </div>
                <div class="govuk-grid-column-one-third">
                  <div class="govuk-form-group">
                    <label class="govuk-label" for="cbkDgE__northing">
                      Northing
                    </label>
                    <div class="govuk-input__wrapper">
                      <input class="govuk-input govuk-input--width-10" id="cbkDgE__northing" name="cbkDgE__northing" type="text" inputmode="text">
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div class="govuk-button-group">
            <button type="submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">Continue</button>
          </div>
        </form>
      `
    })

    describe('Map initialisation', () => {
      test('initMaps easting northing initializes without errors when DOM elements are present', () => {
        expect(() => initMaps()).not.toThrow()
        expect(onMock).toHaveBeenLastCalledWith(
          'map:ready',
          expect.any(Function)
        )

        const onMapReady = onMock.mock.calls[0][1]
        expect(typeof onMapReady).toBe('function')

        // Manually invoke onMapReady callback
        const flyToMock = jest.fn()
        onMapReady({
          map: {
            flyTo: flyToMock
          }
        })

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(interactPluginEnable).toHaveBeenCalled()

        expect(onMock).toHaveBeenLastCalledWith(
          'interact:markerchange',
          expect.any(Function)
        )

        const inputs = document.body.querySelectorAll('input.govuk-input')
        expect(inputs).toHaveLength(2)

        const eastingInput = /** @type {HTMLInputElement} */ (inputs[0])
        const northingInput = /** @type {HTMLInputElement} */ (inputs[1])

        eastingInput.value = '380779'
        eastingInput.dispatchEvent(new window.Event('change'))

        northingInput.value = '462222'
        northingInput.dispatchEvent(new window.Event('change'))

        // Expect it to update once, only when both fields are valid
        expect(addMarkerMock).toHaveBeenCalledTimes(1)
        expect(flyToMock).toHaveBeenCalledTimes(1)

        const onInteractMarkerChange = onMock.mock.calls[1][1]
        expect(typeof onInteractMarkerChange).toBe('function')
        onInteractMarkerChange({
          coords: [-2.147823, 54.155676]
        })
      })

      test('initMaps with initial values', () => {
        const inputs = document.body.querySelectorAll('input.govuk-input')
        expect(inputs).toHaveLength(2)

        const eastingInput = /** @type {HTMLInputElement} */ (inputs[0])
        const northingInput = /** @type {HTMLInputElement} */ (inputs[1])

        // Set some initial values prior to initMaps
        eastingInput.value = '431571'
        northingInput.value = '427585'

        expect(() => initMaps()).not.toThrow()
        expect(onMock).toHaveBeenLastCalledWith(
          'map:ready',
          expect.any(Function)
        )

        const onMapReady = onMock.mock.calls[0][1]
        expect(typeof onMapReady).toBe('function')

        // Manually invoke onMapReady callback
        const flyToMock = jest.fn()
        onMapReady({
          map: {
            flyTo: flyToMock
          }
        })

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(interactPluginEnable).toHaveBeenCalled()

        expect(onMock).toHaveBeenLastCalledWith(
          'interact:markerchange',
          expect.any(Function)
        )

        eastingInput.value = '380779'
        eastingInput.dispatchEvent(new window.Event('change'))

        northingInput.value = '462222'
        northingInput.dispatchEvent(new window.Event('change'))

        // Expect it to update twice as both fields are already valid
        expect(addMarkerMock).toHaveBeenCalledTimes(2)
        expect(flyToMock).toHaveBeenCalledTimes(2)
      })

      test('initMaps only applies when there are location components on the page', () => {
        const locations = document.querySelectorAll('.app-location-field')

        // Remove any locations for the test
        locations.forEach((location) => {
          location.remove()
        })

        expect(() => initMaps()).not.toThrow()
        expect(onMock).not.toHaveBeenCalled()
      })

      test('initMaps only applies when there are supported location components on the page', () => {
        const locations = document.querySelectorAll('.app-location-field')

        // Reset the location type of each component
        locations.forEach((location) => {
          location.setAttribute('data-locationtype', 'unknowntype')
        })

        expect(() => initMaps()).not.toThrow()
        expect(onMock).not.toHaveBeenCalled()
      })
    })
  })

  describe('OS grid reference component', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form method="post" novalidate="">
          <div class="govuk-form-group app-location-field " data-locationtype="osgridreffield">
            <div class="app-location-field-inputs">
              <div class="govuk-form-group">
                <h1 class="govuk-label-wrapper">
                  <label class="govuk-label govuk-label--l" for="VtopAx">
                    OS grid reference
                  </label>
                </h1>
                <div id="VtopAx-hint" class="govuk-hint">
                  An OS grid reference number is made up of 2 letters followed by either 6, 8 or 10 numbers, for example, TQ123456
                </div>
                <input class="govuk-input" id="VtopAx" name="VtopAx" type="text" aria-describedby="VtopAx-hint">
              </div>
            </div>
          </div>
          <div class="govuk-button-group">
            <button type="submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">Continue</button>
          </div>
        </form>
      `
    })

    describe('Map initialisation', () => {
      test('initMaps os grid reference initializes without errors when DOM elements are present', () => {
        expect(() => initMaps()).not.toThrow()
        expect(onMock).toHaveBeenLastCalledWith(
          'map:ready',
          expect.any(Function)
        )

        const onMapReady = onMock.mock.calls[0][1]
        expect(typeof onMapReady).toBe('function')

        // Manually invoke onMapReady callback
        const flyToMock = jest.fn()
        onMapReady({
          map: {
            flyTo: flyToMock
          }
        })

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(interactPluginEnable).toHaveBeenCalled()

        expect(onMock).toHaveBeenLastCalledWith(
          'interact:markerchange',
          expect.any(Function)
        )

        const input = document.body.querySelector('input.govuk-input')
        expect(input).toBeDefined()

        const osGridRefInput = /** @type {HTMLInputElement} */ (input)

        osGridRefInput.value = 'SJ 61831 71507'
        osGridRefInput.dispatchEvent(new window.Event('change'))

        // Expect it to update once
        expect(addMarkerMock).toHaveBeenCalledTimes(1)
        expect(flyToMock).toHaveBeenCalledTimes(1)

        const onInteractMarkerChange = onMock.mock.calls[1][1]
        expect(typeof onInteractMarkerChange).toBe('function')
        onInteractMarkerChange({
          coords: [-2.147823, 54.155676]
        })
      })

      test('initMaps with initial values', () => {
        const input = document.body.querySelector('input.govuk-input')
        expect(input).toBeDefined()

        const osGridRefInput = /** @type {HTMLInputElement} */ (input)

        // Set some initial values prior to initMaps
        osGridRefInput.value = 'SJ 61831 71500'

        expect(() => initMaps()).not.toThrow()
        expect(onMock).toHaveBeenLastCalledWith(
          'map:ready',
          expect.any(Function)
        )

        const onMapReady = onMock.mock.calls[0][1]
        expect(typeof onMapReady).toBe('function')

        // Manually invoke onMapReady callback
        const flyToMock = jest.fn()
        onMapReady({
          map: {
            flyTo: flyToMock
          }
        })

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(interactPluginEnable).toHaveBeenCalled()

        expect(onMock).toHaveBeenLastCalledWith(
          'interact:markerchange',
          expect.any(Function)
        )

        osGridRefInput.value = 'SJ 61836 71440'
        osGridRefInput.dispatchEvent(new window.Event('change'))

        // Expect it to update once as the field is valid
        expect(addMarkerMock).toHaveBeenCalledTimes(1)
        expect(flyToMock).toHaveBeenCalledTimes(1)
      })

      test('initMaps only applies when there are location components on the page', () => {
        const locations = document.querySelectorAll('.app-location-field')

        // Remove any locations for the test
        locations.forEach((location) => {
          location.remove()
        })

        expect(() => initMaps()).not.toThrow()
        expect(onMock).not.toHaveBeenCalled()
      })

      test('initMaps only applies when there are supported location components on the page', () => {
        const locations = document.querySelectorAll('.app-location-field')

        // Reset the location type of each component
        locations.forEach((location) => {
          location.setAttribute('data-locationtype', 'unknowntype')
        })

        expect(() => initMaps()).not.toThrow()
        expect(onMock).not.toHaveBeenCalled()
      })
    })
  })

  describe('Geospatial component', () => {
    /** @type {import('~/src/server/plugins/engine/types.js').Feature[]} */
    let features

    beforeEach(() => {
      features = [
        {
          type: 'Feature',
          properties: {
            description: 'Buckingham palace',
            coordinateGridReference: 'TQ 29031 79662',
            centroidGridReference: 'TQ 29031 79662'
          },
          geometry: {
            type: 'Point',
            coordinates: [-0.14242385752663722, 51.50118200993498]
          },
          id: '6d67810c-7228-4f71-b6ec-0d16b132fcd7'
        },
        {
          id: '6d75415d-31e8-4ce7-88f0-621ae3321d6a',
          type: 'Feature',
          properties: {
            description: "St James' Park",
            coordinateGridReference: 'TQ 29560 79824',
            centroidGridReference: 'TQ 29200 79762'
          },
          geometry: {
            coordinates: [
              [
                [-0.13995851581486818, 51.50204381014825],
                [-0.13995851581486818, 51.50165035614205],
                [-0.14019554033424697, 51.501429036771015],
                [-0.13964248312336736, 51.50096180345744],
                [-0.13908942591109508, 51.50039619882682],
                [-0.12984546966541188, 51.50130608110035],
                [-0.12968745331966147, 51.50270775608101],
                [-0.1288973715894599, 51.503666772017255],
                [-0.12937142062813223, 51.50509296351919],
                [-0.13083307182887438, 51.505855219983005],
                [-0.13995851581486818, 51.50204381014825]
              ]
            ],
            type: 'Polygon'
          }
        },
        {
          id: '20e4fcc4-d9b0-4226-8d02-a3fbb314ba4a',
          type: 'Feature',
          properties: {
            description: 'Constitution Hill',
            coordinateGridReference: 'TQ 29560 79824',
            centroidGridReference: 'TQ 29560 79824'
          },
          geometry: {
            coordinates: [
              [-0.14969813781837615, 51.502534952613814],
              [-0.1404050934734471, 51.50217984872572]
            ],
            type: 'LineString'
          }
        }
      ]

      document.body.innerHTML = `
        <form method="post" novalidate="">
          <div class="app-geospatial-field">
            <div class="govuk-form-group">
              <h1 class="govuk-label-wrapper">
                <label class="govuk-label govuk-label--l" for="DzDkCy">
                  Add site geospatial features
                </label>
              </h1>
              <textarea class="govuk-textarea" id="DzDkCy" name="DzDkCy" rows="5"></textarea>
            </div>
          </div>
          <div class="govuk-button-group">
            <button type="submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">Continue</button>
          </div>
        </form>
      `
    })

    /**
     * Initialise geospatial maps helper
     */
    function initialiseGeospatialMaps(prefillFeatures = true) {
      const input = document.body.querySelector('textarea.govuk-textarea')
      expect(input).toBeDefined()

      const geospatialInput = /** @type {HTMLInputElement} */ (input)

      // Set some initial values prior to initMaps
      geospatialInput.value = prefillFeatures
        ? JSON.stringify(features, null, 2)
        : ''

      expect(() => initMaps()).not.toThrow()
      expect(onMock).toHaveBeenCalledTimes(1)
      expect(onMock).toHaveBeenNthCalledWith(
        1,
        'map:ready',
        expect.any(Function)
      )

      const onMapReady = onMock.mock.calls[0][1]
      expect(typeof onMapReady).toBe('function')

      // Manually invoke onMapReady callback
      onMapReady({})

      expect(onMock).toHaveBeenCalledTimes(6)
      expect(onMock).toHaveBeenNthCalledWith(
        2,
        'draw:ready',
        expect.any(Function)
      )
      expect(onMock).toHaveBeenNthCalledWith(
        3,
        'draw:created',
        expect.any(Function)
      )
      expect(onMock).toHaveBeenNthCalledWith(
        4,
        'draw:edited',
        expect.any(Function)
      )
      expect(onMock).toHaveBeenNthCalledWith(
        5,
        'draw:cancelled',
        expect.any(Function)
      )
      expect(onMock).toHaveBeenNthCalledWith(
        6,
        'interact:markerchange',
        expect.any(Function)
      )

      const onDrawReady = onMock.mock.calls[1][1]
      expect(typeof onDrawReady).toBe('function')

      // Manually invoke onDrawReady callback
      onDrawReady()

      const listContainer = document.body.querySelector('#geospatialmap_0_list')

      if (listContainer === null) {
        throw new Error('Unexpected null found for listContainer')
      }
      expect(listContainer).toBeDefined()

      return {
        geospatialInput,
        listContainer: /** @type {HTMLDivElement} */ (listContainer)
      }
    }

    /**
     * Test action button toggle state helper
     * @param {boolean} hidden
     * @param {number} [offset]
     */
    function expectToggleButtons(hidden, offset = 0) {
      expect(toggleButtonStateMock).toHaveBeenCalledTimes(3 + offset)
      expect(toggleButtonStateMock).toHaveBeenNthCalledWith(
        1 + offset,
        'btnAddPoint',
        'hidden',
        hidden
      )
      expect(toggleButtonStateMock).toHaveBeenNthCalledWith(
        2 + offset,
        'btnAddPolygon',
        'hidden',
        hidden
      )
      expect(toggleButtonStateMock).toHaveBeenNthCalledWith(
        3 + offset,
        'btnAddLine',
        'hidden',
        hidden
      )
    }

    /**
     * Get the change link element by id
     * @param {HTMLDivElement} listContainer
     * @param {string} id
     */
    function getChangeLink(listContainer, id) {
      return getLink(listContainer, id, 'edit')
    }

    /**
     * Get the delete link element by id
     * @param {HTMLDivElement} listContainer
     * @param {string} id
     */
    function getDeleteLink(listContainer, id) {
      return getLink(listContainer, id, 'delete')
    }

    /**
     * Get the link element by id
     * @param {HTMLDivElement} listContainer
     * @param {string} id
     * @param {'edit'|'delete'} type
     */
    function getLink(listContainer, id, type) {
      const linkEl = listContainer.querySelector(
        `.govuk-link.govuk-link--no-visited-state[data-action="${type}"][data-id="${id}"]`
      )

      expect(linkEl).toBeDefined()

      if (linkEl === null) {
        throw new Error(`Unexpected null found for ${type} link ${id}`)
      }

      return /** @type {HTMLAnchorElement} */ (linkEl)
    }

    /**
     * Get the decsription element by id
     * @param {HTMLDivElement} listContainer
     * @param {number} index
     */
    function getDescription(listContainer, index) {
      const descriptionEl = listContainer.querySelector(
        `input[id="description_${index}"]`
      )

      expect(descriptionEl).toBeDefined()

      if (descriptionEl === null) {
        throw new Error(`Unexpected null found for description ${index}`)
      }

      return /** @type {HTMLInputElement} */ (descriptionEl)
    }

    describe('Map initialisation', () => {
      test('initMaps geospatial component initializes without errors when DOM elements are present', () => {
        initialiseGeospatialMaps()

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(addButtonMock).toHaveBeenCalledTimes(3)
        expect(interactPluginEnable).not.toHaveBeenCalled()
      })

      test('initMaps with initial values', () => {
        initialiseGeospatialMaps()

        expect(drawPluginAddFeature).toHaveBeenCalledTimes(2)
        expect(addMarkerMock).toHaveBeenCalledOnce()
      })

      test('initMaps with no initial value', () => {
        // Reset the document body with an initial value for the country boundary
        document.body.innerHTML = `
          <form method="post" novalidate="">
            <div class="app-geospatial-field" data-country="scotland">
              <div class="govuk-form-group">
                <h1 class="govuk-label-wrapper">
                  <label class="govuk-label govuk-label--l" for="DzDkCy">
                    Add site geospatial features
                  </label>
                </h1>
                <textarea class="govuk-textarea" id="DzDkCy" name="DzDkCy" rows="5"></textarea>
              </div>
            </div>
            <div class="govuk-button-group">
              <button type="submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">Continue</button>
            </div>
          </form>
        `

        initialiseGeospatialMaps()

        expect(datasetsMaplibrePlugin).toHaveBeenCalledWith({
          datasets: Array(2).fill(expect.any(Object))
        })
        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(addButtonMock).toHaveBeenCalledTimes(3)
        expect(interactPluginEnable).not.toHaveBeenCalled()
      })

      test('drawing created', () => {
        const { geospatialInput } = initialiseGeospatialMaps()

        const onDrawCreated = onMock.mock.calls[2][1]
        expect(typeof onDrawCreated).toBe('function')

        // Manually invoke onDrawCreated callback with a new polygon
        const newPolygonFeature = {
          id: 'guid',
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-2.0868919921875886, 53.896834237148596],
                [-1.8561791015627875, 53.728181570441876],
                [-1.3068626953125317, 54.019651598965936],
                [-2.0868919921875886, 53.896834237148596]
              ]
            ]
          }
        }

        onDrawCreated(newPolygonFeature)
        expectToggleButtons(false)

        expect(geospatialInput.value).toBe(
          JSON.stringify(
            [
              ...features,
              {
                ...newPolygonFeature,
                properties: {
                  description: '',
                  coordinateGridReference: 'SD 94387 44521',
                  centroidGridReference: 'SE 16533 42846'
                }
              }
            ],
            null,
            2
          )
        )

        // Manually invoke onDrawCreated callback with a new line
        const newLineFeature = {
          id: 'guid1',
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-1.3068626953125317, 54.019651598965936],
              [-2.0868919921875886, 53.896834237148596]
            ]
          }
        }

        onDrawCreated(newLineFeature)
        expectToggleButtons(false, 3)

        expect(geospatialInput.value).toBe(
          JSON.stringify(
            [
              ...features,
              {
                ...newPolygonFeature,
                properties: {
                  description: '',
                  coordinateGridReference: 'SD 94387 44521',
                  centroidGridReference: 'SE 16533 42846'
                }
              },
              {
                ...newLineFeature,
                properties: {
                  description: '',
                  coordinateGridReference: 'SE 45512 58405',
                  centroidGridReference: 'SE 19987 51392'
                }
              }
            ],
            null,
            2
          )
        )
      })

      test('drawing edited', () => {
        const { geospatialInput, listContainer } = initialiseGeospatialMaps()

        const onDrawEdited = onMock.mock.calls[3][1]
        expect(typeof onDrawEdited).toBe('function')

        // Manually click the "Change" link to set the _activeFeatureId
        const stJamesParkChangeLink = getChangeLink(
          listContainer,
          '6d75415d-31e8-4ce7-88f0-621ae3321d6a'
        )
        stJamesParkChangeLink.click()

        expect(drawPluginEditFeature).toHaveBeenCalledWith(
          '6d75415d-31e8-4ce7-88f0-621ae3321d6a'
        )

        expectToggleButtons(true)

        // Manually invoke onDrawEdited callback with updated feature
        const updatedPolygonFeature = {
          ...features[1],
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 1],
                [2, 2]
              ]
            ]
          },
          properties: {
            description: "St James' Park",
            coordinateGridReference: 'TQ 29200 79762',
            centroidGridReference: 'TQ 29560 79824'
          }
        }

        onDrawEdited(updatedPolygonFeature)

        expect(geospatialInput.value).toBe(
          JSON.stringify(
            [features[0], updatedPolygonFeature, features[2]],
            null,
            2
          )
        )

        expectToggleButtons(false, 3)
      })

      test('drawing deleted', () => {
        const { geospatialInput, listContainer } = initialiseGeospatialMaps()

        // Manually click the "Delete" link to set the _activeFeatureId
        const stJamesParkDeleteLink = getDeleteLink(
          listContainer,
          '6d75415d-31e8-4ce7-88f0-621ae3321d6a'
        )

        stJamesParkDeleteLink.click()

        expect(drawPluginDeleteFeature).toHaveBeenCalledWith(
          '6d75415d-31e8-4ce7-88f0-621ae3321d6a'
        )

        expect(JSON.parse(geospatialInput.value)).toHaveLength(2)
        expect(geospatialInput.value).toBe(
          JSON.stringify([features[0], features[2]], null, 2)
        )
      })

      test('drawing cancelled', () => {
        initialiseGeospatialMaps()

        const onDrawCancelled = onMock.mock.calls[4][1]
        expect(typeof onDrawCancelled).toBe('function')

        // Manually invoke onDrawReady callback (to render the list)
        onDrawCancelled()
        expectToggleButtons(false)
      })

      test('marker added', () => {
        const { geospatialInput } = initialiseGeospatialMaps()

        const interactMarkerChange = onMock.mock.calls[5][1]
        expect(typeof interactMarkerChange).toBe('function')

        // Manually invoke interactMarkerChange callback with a new point
        const newPointFeature = {
          coords: [-2.0868919921875886, 53.896834237148596]
        }

        interactMarkerChange(newPointFeature)

        expect(addMarkerMock).toHaveBeenLastCalledWith(
          expect.any(String),
          newPointFeature.coords
        )
        expect(removeMarkerMock).toHaveBeenCalledExactlyOnceWith('location')
        expect(interactPluginDisable).toHaveBeenCalled()
        expectToggleButtons(false)

        expect(JSON.parse(geospatialInput.value)).toEqual([
          ...features,
          {
            geometry: {
              type: 'Point',
              coordinates: [-2.086892, 53.8968342]
            },
            properties: {
              description: '',
              coordinateGridReference: 'SD 94387 44521',
              centroidGridReference: 'SD 94387 44521'
            },
            id: expect.any(String),
            type: 'Feature'
          }
        ])
      })

      test('marker edited', () => {
        const { geospatialInput, listContainer } = initialiseGeospatialMaps()

        const interactMarkerChange = onMock.mock.calls[5][1]
        expect(typeof interactMarkerChange).toBe('function')

        // Manually click the "Change" link to set the _activeFeatureId
        const buckinghamPalaceChangeLink = getChangeLink(
          listContainer,
          '6d67810c-7228-4f71-b6ec-0d16b132fcd7'
        )
        buckinghamPalaceChangeLink.click()

        expect(interactPluginSelectFeature).toHaveBeenCalledExactlyOnceWith({
          featureId: '6d67810c-7228-4f71-b6ec-0d16b132fcd7'
        })
        expect(interactPluginEnable).toHaveBeenCalledOnce()
        expectToggleButtons(true)

        // Manually invoke interactMarkerChange callback with a new point
        const updatedPointArgs = {
          coords: [0, 0]
        }

        interactMarkerChange(updatedPointArgs)

        expect(addMarkerMock).toHaveBeenLastCalledWith(
          '6d67810c-7228-4f71-b6ec-0d16b132fcd7',
          [0, 0]
        )

        expect(geospatialInput.value).toBe(
          JSON.stringify(
            [
              {
                ...features[0],
                geometry: {
                  ...features[0].geometry,
                  coordinates: [0, 0]
                }
              },
              ...features.splice(1)
            ],
            null,
            2
          )
        )
      })

      test('marker deleted', () => {
        const { geospatialInput, listContainer } = initialiseGeospatialMaps()

        // Manually click the "Delete" link to set the _activeFeatureId
        const buckinghamPalaceDeleteLink = getDeleteLink(
          listContainer,
          '6d67810c-7228-4f71-b6ec-0d16b132fcd7'
        )

        buckinghamPalaceDeleteLink.click()

        expect(removeMarkerMock).toHaveBeenCalledWith(
          '6d67810c-7228-4f71-b6ec-0d16b132fcd7'
        )

        expect(JSON.parse(geospatialInput.value)).toHaveLength(2)
        expect(geospatialInput.value).toBe(
          JSON.stringify([features[1], features[2]], null, 2)
        )
      })

      test('action buttons', () => {
        initialiseGeospatialMaps()

        const onMapReady = onMock.mock.calls[5][1]
        expect(typeof onMapReady).toBe('function')

        expect(addButtonMock).toHaveBeenCalledTimes(3)
        const { onClick: onAddPointClick } = addButtonMock.mock.calls[0][1]
        const { onClick: onAddPolygonClick } = addButtonMock.mock.calls[1][1]
        const { onClick: onAddLineClick } = addButtonMock.mock.calls[2][1]

        expect(typeof onAddPointClick).toBe('function')
        expect(typeof onAddPolygonClick).toBe('function')
        expect(typeof onAddLineClick).toBe('function')

        // Manually invoke add point button click
        onAddPointClick()
        expectToggleButtons(true)
        expect(interactPluginEnable).toHaveBeenCalledTimes(1)

        // Manually invoke add polygon button click
        onAddPolygonClick()
        expectToggleButtons(true, 3)
        expect(drawPluginNewPolygon).toHaveBeenCalledExactlyOnceWith(
          expect.any(String),
          expect.any(Object)
        )

        // Manually invoke add line button click
        onAddLineClick()
        expectToggleButtons(true, 6)
        expect(drawPluginNewLine).toHaveBeenCalledExactlyOnceWith(
          expect.any(String),
          expect.any(Object)
        )
      })

      test('description changed', () => {
        const { geospatialInput, listContainer } = initialiseGeospatialMaps()

        // Manually change the description
        const buckinghamPalaceInputEl = getDescription(listContainer, 0)

        buckinghamPalaceInputEl.value = 'New description'
        buckinghamPalaceInputEl.dispatchEvent(
          new window.Event('change', { bubbles: true })
        )

        expect(JSON.parse(geospatialInput.value)).toEqual([
          {
            ...features[0],
            properties: {
              description: 'New description',
              coordinateGridReference: 'TQ 29031 79662',
              centroidGridReference: 'TQ 29031 79662'
            }
          },
          ...features.slice(1)
        ])
      })

      test('description enter/return key', () => {
        const { geospatialInput, listContainer } = initialiseGeospatialMaps()

        // Manually change the description
        const buckinghamPalaceInputEl = getDescription(listContainer, 0)

        buckinghamPalaceInputEl.value = 'New description'
        buckinghamPalaceInputEl.dispatchEvent(
          new window.Event('change', { bubbles: true })
        )
        buckinghamPalaceInputEl.dispatchEvent(
          new window.KeyboardEvent('keydown', { bubbles: true, code: 'Enter' })
        )

        expect(JSON.parse(geospatialInput.value)).toEqual([
          {
            ...features[0],
            properties: {
              description: 'New description',
              coordinateGridReference: 'TQ 29031 79662',
              centroidGridReference: 'TQ 29031 79662'
            }
          },
          ...features.slice(1)
        ])
      })

      test('description enter/return numpad key', () => {
        const { geospatialInput, listContainer } = initialiseGeospatialMaps()

        // Manually change the description
        const buckinghamPalaceInputEl = getDescription(listContainer, 0)

        buckinghamPalaceInputEl.value = 'New description'
        buckinghamPalaceInputEl.dispatchEvent(
          new window.Event('change', { bubbles: true })
        )
        buckinghamPalaceInputEl.dispatchEvent(
          new window.KeyboardEvent('keydown', {
            bubbles: true,
            code: 'NumpadEnter'
          })
        )

        expect(JSON.parse(geospatialInput.value)).toEqual([
          {
            ...features[0],
            properties: {
              description: 'New description',
              coordinateGridReference: 'TQ 29031 79662',
              centroidGridReference: 'TQ 29031 79662'
            }
          },
          ...features.slice(1)
        ])
      })

      test('createFeaturesHTML - normal', () => {
        const html = createFeaturesHTML(features.slice(1), 'test', false, false)

        expect(html).toContain('data-action="delete"')
        expect(html).toContain('data-action="edit"')
        expect(html).not.toContain('govuk-link--disabled')
        expect(html).not.toContain('data-action="focus"')
      })

      test('createFeaturesHTML - normal (defaults)', () => {
        const html = createFeaturesHTML(features.slice(1), 'test')

        expect(html).toContain('data-action="delete"')
        expect(html).toContain('data-action="edit"')
        expect(html).not.toContain('govuk-link--disabled')
        expect(html).not.toContain('data-action="focus"')
      })

      test('createFeaturesHTML - readonly (for use in designer viewer)', () => {
        const html = createFeaturesHTML(features.slice(1), 'test', false, true)

        expect(html).not.toContain('data-action="delete"')
        expect(html).not.toContain('data-action="edit"')
        expect(html).toContain('data-action="focus"')
      })

      test('createFeaturesHTML - disabled', () => {
        const html = createFeaturesHTML(features.slice(1), 'test', true, false)

        expect(html).toContain('govuk-link--disabled')
        expect(html).toContain('data-action="delete"')
        expect(html).toContain('data-action="edit"')
        expect(html).not.toContain('data-action="focus"')
      })

      test('createFeatureHTML - normal (defaults)', () => {
        const html = createFeatureHTML(features[1], 0, 'test')

        expect(html).toContain('data-action="delete"')
        expect(html).toContain('data-action="edit"')
        expect(html).not.toContain('govuk-link--disabled')
        expect(html).not.toContain('data-action="focus"')
      })

      test('initMaps with no country boundaries', () => {
        initialiseGeospatialMaps(false)

        expect(interactPlugin).toHaveBeenCalledWith(expect.any(Object))
        expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))
        expect(addButtonMock).toHaveBeenCalledTimes(3)
        expect(interactPluginEnable).not.toHaveBeenCalled()
      })
    })
  })

  describe('Form submit event propagation', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form method="post" novalidate="">
          <div class="govuk-form-group app-location-field " data-locationtype="latlongfield">
            <fieldset class="govuk-fieldset" aria-describedby="cbkDgE-hint">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--l">
                What is your latitude and longitude (optional)
              </legend>
              <div id="cbkDgE-hint" class="govuk-hint">
                For Great Britain, the latitude will be a number between 49.850 and 60.859. The longitude will be a number between -13.687 and 1.767
              </div>
              <div class="govuk-grid-row app-location-field-inputs">
                <div class="govuk-grid-column-one-third">
                  <div class="govuk-form-group">
                    <label class="govuk-label" for="cbkDgE__latitude">Latitude</label>
                    <div class="govuk-input__wrapper">
                      <input class="govuk-input govuk-input--width-10" id="cbkDgE__latitude" name="cbkDgE__latitude" type="text" value="53.2392016" inputmode="text">
                      <div class="govuk-input__suffix" aria-hidden="true">°</div>
                    </div>
                  </div>
                </div>
                <div class="govuk-grid-column-one-third">
                  <div class="govuk-form-group">
                    <label class="govuk-label" for="cbkDgE__longitude">
                      Longitude
                    </label>
                    <div class="govuk-input__wrapper">
                      <input class="govuk-input govuk-input--width-10" id="cbkDgE__longitude" name="cbkDgE__longitude" type="text" value="-2.5734104" inputmode="text">
                      <div class="govuk-input__suffix" aria-hidden="true">°</div>
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div class="govuk-button-group">
            <button type="submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">Continue</button>
          </div>
        </form>
      `
    })

    test('form does submit when submitter is the main form button', () => {
      const preventDefault = jest.fn()

      initMaps()

      const form = document.body.querySelector('form')
      if (!form) {
        throw new TypeError('Unexpected empty form')
      }

      const buttons = Array.from(form.querySelectorAll('button'))
      const onFormSubmit = formSubmitFactory(buttons)

      const e = /** @type {SubmitEvent} */ (
        /** @type {unknown} */ ({
          submitter: buttons.at(0),
          preventDefault
        })
      )

      onFormSubmit(e)

      expect(preventDefault).toHaveBeenCalledTimes(0)
    })

    test('form does not submit unless it is the main form button', () => {
      const preventDefault = jest.fn()

      initMaps()

      const form = document.body.querySelector('form')
      if (!form) {
        throw new TypeError('Unexpected empty form')
      }

      const buttons = Array.from(form.querySelectorAll('button'))
      const onFormSubmit = formSubmitFactory(buttons)

      const e = /** @type {SubmitEvent} */ (
        /** @type {unknown} */ ({
          submitter: null,
          preventDefault
        })
      )

      onFormSubmit(e)

      expect(preventDefault).toHaveBeenCalledTimes(1)
    })
  })

  describe('Tile request transformer', () => {
    const apiPath = '/api'

    test('tile request transformer factory returns a transformer function', () => {
      const transformer = makeTileRequestTransformer(apiPath)

      expect(typeof transformer).toBe('function')
      expect(transformer).toHaveLength(2)
    })

    test('tile request transformer works on api.os.uk requests without an apikey', () => {
      const url = 'https://api.os.uk/test.js'
      const transformer = makeTileRequestTransformer(apiPath)
      const result = transformer(url, 'Script')

      expect(result).toEqual({
        url: `${apiPath}/map-proxy?url=${encodeURIComponent(url)}`,
        headers: {}
      })
    })

    test('tile request transformer does not apply to "Style" api.os.uk requests', () => {
      const url = 'https://api.os.uk/test.js'
      const transformer = makeTileRequestTransformer(apiPath)
      const result = transformer(url, 'Style')

      expect(result).toEqual({
        url,
        headers: {}
      })
    })

    test('tile request transformer does not apply to other domain requests', () => {
      const url = 'https://esri.os.uk/test.js'
      const transformer = makeTileRequestTransformer(apiPath)
      const result = transformer(url, 'Script')

      expect(result).toEqual({
        url,
        headers: {}
      })
    })

    test('tile request transformer works on raw.githubusercontent.com style and sprite requests', () => {
      const url =
        'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857/resources/sprites/sprite@2x.json'
      const transformer = makeTileRequestTransformer(apiPath)
      const result = transformer(url, 'SpriteJSON')

      expect(result).toEqual({
        url: `${apiPath}/maps/vts/OS_VTS_3857/resources/sprites/sprite@2x.json`,
        headers: {}
      })
    })
  })

  describe('Gridref helpers', () => {
    test('it should return centroid gridref for a point feature', () => {
      const result = getCentroidGridRef({
        id: 'id',
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-0.1356213, 51.5121161]
        },
        properties: {
          description: 'New point'
        }
      })

      expect(result).toBe('TQ 29472 80890')
    })

    test('it should return centroid gridref for a linestring feature', () => {
      const result = getCentroidGridRef({
        id: 'id',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-0.1356213, 51.5121161],
            [-0.0578579, 51.5182996]
          ]
        },
        properties: {
          description: 'New line'
        }
      })

      expect(result).toBe('TQ 32161 81303')
    })

    test('it should return centroid gridref for a polygon feature', () => {
      const result = getCentroidGridRef({
        id: 'id',
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.1356213, 51.5121161],
              [-0.0578579, 51.5182996],
              [-0.1114282, 51.5602178],
              [-0.1356213, 51.5121161]
            ]
          ]
        },
        properties: {
          description: 'New polygon'
        }
      })

      expect(result).toBe('TQ 31778 82963')
    })

    test('it should return coordinate gridref for a point feature', () => {
      const result = getCoordinateGridRef({
        id: 'id',
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-0.1356213, 51.5121161]
        },
        properties: {
          description: 'New point'
        }
      })

      expect(result).toBe('TQ 29472 80890')
    })

    test('it should return coordinate gridref for a linestring feature', () => {
      const result = getCoordinateGridRef({
        id: 'id',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-0.1356213, 51.5121161],
            [-0.0578579, 51.5182996]
          ]
        },
        properties: {
          description: 'New line'
        }
      })

      expect(result).toBe('TQ 29472 80890')
    })

    test('it should return coordinate gridref for a polygon feature', () => {
      const result = getCoordinateGridRef({
        id: 'id',
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.1356213, 51.5121161],
              [-0.0578579, 51.5182996],
              [-0.1114282, 51.5602178],
              [-0.1356213, 51.5121161]
            ]
          ]
        },
        properties: {
          description: 'New polygon'
        }
      })

      expect(result).toBe('TQ 29472 80890')
    })
  })

  describe('Geocode request transformer - temporarily needed until v0.0.18', () => {
    test('it should return centroid gridref for a point feature', () => {
      const result = transformGeocodeRequest({
        url: '/a/b/c',
        options: {
          method: 'get'
        }
      })

      expect(result instanceof Request).toBe(true)
    })
  })
})
