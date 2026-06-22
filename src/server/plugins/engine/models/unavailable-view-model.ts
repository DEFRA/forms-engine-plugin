import { type FormMetadata, type FormMetadataContact } from '@defra/forms-model'

export interface UnavailableViewModel {
  pageTitle: string
  formTitle: string
  organisationName: string
  contact?: FormMetadataContact
}

/**
 * Defra organisations carry an abbreviation suffix on the enum value, e.g.
 * "Rural Payments Agency – RPA". The unavailable page reads cleanly without it.
 */
function stripOrgSuffix(organisation: string) {
  const orgName = organisation.split(' – ')[0]
  return orgName === 'Defra' || orgName === 'Natural England'
    ? orgName
    : `the ${orgName}`
}

export function unavailableViewModel(
  metadata: FormMetadata
): UnavailableViewModel {
  return {
    pageTitle: 'Sorry, this form is unavailable',
    formTitle: metadata.title,
    organisationName: stripOrgSuffix(metadata.organisation),
    contact: metadata.contact
  }
}
