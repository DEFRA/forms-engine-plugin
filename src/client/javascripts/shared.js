import { initAllAutocomplete as initAllAutocompleteImp } from '~/src/client/javascripts/autocomplete.js'
import { initFileUpload as initFileUploadImp } from '~/src/client/javascripts/file-upload.js'
import { initAllGovuk as initAllGovukImp } from '~/src/client/javascripts/govuk.js'
import { initMaps as initMapsImp } from '~/src/client/javascripts/location-map.js'
import { initPreviewCloseLink as initPreviewCloseLinkImp } from '~/src/client/javascripts/preview-close-link.js'

export const initAllGovuk = initAllGovukImp
export const initAllAutocomplete = initAllAutocompleteImp
export const initFileUpload = initFileUploadImp
export const initPreviewCloseLink = initPreviewCloseLinkImp
export const initMaps = initMapsImp

/**
 * Initialise all clientside components (but not maps as this will be an opt-in for now given the additional UMD assets that are required)
 */
export function initAll() {
  initAllGovuk()
  initAllAutocomplete()
  initFileUpload()
  initPreviewCloseLink()
}
