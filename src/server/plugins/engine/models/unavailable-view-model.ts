import { type FormMetadata, type FormMetadataContact } from '@defra/forms-model'

export interface UnavailableViewModel {
  pageTitle: string
  formTitle: string
  organisationName: string
  contact?: FormMetadataContact
}

export function unavailableViewModel(
  metadata: FormMetadata
): UnavailableViewModel {
  return {
    pageTitle: 'Sorry, this form is unavailable',
    formTitle: metadata.title,
    organisationName: metadata.organisation,
    contact: metadata.contact
  }
}
