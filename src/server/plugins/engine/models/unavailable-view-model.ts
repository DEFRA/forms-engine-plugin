import { type FormMetadata } from '@defra/forms-model'

export interface UnavailableViewModel {
  pageTitle: string
  formTitle: string
  organisationName: string
  phoneLines?: string[]
}

/**
 * Defra organisations carry an abbreviation suffix on the enum value, e.g.
 * "Rural Payments Agency – RPA". The unavailable page reads cleanly without it.
 */
function stripOrgSuffix(organisation: string) {
  return organisation.split(' – ')[0]
}

function splitPhoneLines(phone: string | undefined) {
  if (!phone) return undefined
  const lines = phone
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.length > 0 ? lines : undefined
}

export function unavailableViewModel(
  metadata: FormMetadata
): UnavailableViewModel {
  return {
    pageTitle: 'Sorry, this form is unavailable',
    formTitle: metadata.title,
    organisationName: stripOrgSuffix(metadata.organisation),
    phoneLines: splitPhoneLines(metadata.contact?.phone)
  }
}
