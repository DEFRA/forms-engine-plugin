import {
  formSubmitFactory,
  initMaps,
  makeTileRequestTransformer
} from '~/src/client/javascripts/location-map.js'

describe('Location Maps Client JS', () => {
  /** @type {jest.Mock} */
  let onMock

  /** @type {jest.Mock} */
  let addMarkerMock

  /** @type {jest.Mock} */
  let addPanelMock

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noop = () => {}
    onMock = jest.fn()
    addMarkerMock = jest.fn()
    addPanelMock = jest.fn()

    class MockDefraMap {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      on = onMock
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addMarker = addMarkerMock
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addPanel = addPanelMock
    }

    // @ts-expect-error - loaded via UMD
    window.defra = {
      DefraMap: MockDefraMap,
      maplibreProvider: noop,
      openNamesProvider: noop,
      mapStylesPlugin: noop,
      interactPlugin: noop,
      searchPlugin: noop,
      zoomControlsPlugin: noop,
      scaleBarPlugin: noop
    }

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

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Map initialisation', () => {
    test('initMaps initializes without errors when DOM elements are present', () => {
      expect(() => initMaps()).not.toThrow()
      expect(onMock).toHaveBeenLastCalledWith('map:ready', expect.any(Function))

      const onMapReady = onMock.mock.calls[0][1]
      expect(typeof onMapReady).toBe('function')

      // Manually invoke onMapReady callback
      const flyToMock = jest.fn()
      onMapReady({
        map: {
          flyTo: flyToMock
        }
      })

      expect(addPanelMock).toHaveBeenCalledWith('info', expect.any(Object))

      expect(onMock).toHaveBeenLastCalledWith(
        'interact:markerchange',
        expect.any(Function)
      )

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const onInteractMarkerChange = onMock.mock.calls[1][1]
      expect(typeof onInteractMarkerChange).toBe('function')
      onInteractMarkerChange({ coords: [0, 0] })

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
  })

  describe('Form submit event propagation', () => {
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

    test('tile request transformer does not apply to api.os.uk requests that already have an api key', () => {
      const url = 'https://api.os.uk/test.js?key=abcde'
      const transformer = makeTileRequestTransformer(apiPath)
      const result = transformer(url, 'Script')

      expect(result).toEqual({
        url,
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
  })
})
