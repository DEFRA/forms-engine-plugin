import { initAllAutocomplete } from '~/src/client/javascripts/autocomplete.js'
import { initFileUpload } from '~/src/client/javascripts/file-upload.js'
import { initAllGovuk } from '~/src/client/javascripts/govuk.js'
import { initMaps } from '~/src/client/javascripts/location-map.js'
import { initPreviewCloseLink } from '~/src/client/javascripts/preview-close-link.js'
import { initAll } from '~/src/client/javascripts/shared.js'

jest.mock('~/src/client/javascripts/autocomplete.js')
jest.mock('~/src/client/javascripts/file-upload.js')
jest.mock('~/src/client/javascripts/govuk.js')
jest.mock('~/src/client/javascripts/location-map.js')
jest.mock('~/src/client/javascripts/preview-close-link.js')

describe('Shared client JS', () => {
  test('initAll initialises all the shared client imports apart from maps', () => {
    initAll()

    expect(initAllAutocomplete).toHaveBeenCalledTimes(1)
    expect(initFileUpload).toHaveBeenCalledTimes(1)
    expect(initAllGovuk).toHaveBeenCalledTimes(1)
    expect(initPreviewCloseLink).toHaveBeenCalledTimes(1)
    expect(initMaps).toHaveBeenCalledTimes(0)
  })
})
