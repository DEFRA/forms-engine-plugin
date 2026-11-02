import {
  Button,
  CharacterCount,
  Checkboxes,
  ErrorSummary,
  FileUpload,
  Header,
  NotificationBanner,
  Radios,
  SkipLink,
  createAll
} from 'govuk-frontend'

export function initAllGovuk() {
  createAll(Button)
  createAll(CharacterCount)
  createAll(Checkboxes)
  createAll(ErrorSummary)
  createAll(Header)
  createAll(FileUpload)
  createAll(NotificationBanner)
  createAll(Radios)
  createAll(SkipLink)
}
