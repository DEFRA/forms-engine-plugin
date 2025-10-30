import { initAllAutocomplete as initAllAutocompleteImp } from '~/src/client/javascripts/autocomplete.js'
import { initEastingNorthing as initEastingNorthingImp } from '~/src/client/javascripts/easting-northing.js'
import { initFileUpload as initFileUploadImp } from '~/src/client/javascripts/file-upload.js'
import { initAllGovuk as initAllGovukImp } from '~/src/client/javascripts/govuk.js'
import { initPreviewCloseLink as initPreviewCloseLinkImp } from '~/src/client/javascripts/preview-close-link.js'

export const initAllGovuk = initAllGovukImp
export const initAllAutocomplete = initAllAutocompleteImp
export const initFileUpload = initFileUploadImp
export const initPreviewCloseLink = initPreviewCloseLinkImp
export const initEastingNorthing = initEastingNorthingImp

export function initAll() {
  initAllGovuk()
  initAllAutocomplete()
  initFileUpload()
  initPreviewCloseLink()
  initEastingNorthing()
}
