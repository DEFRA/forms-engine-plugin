import { type FormMetadata } from '@defra/forms-model'

import { unavailableViewModel } from '~/src/server/plugins/engine/models/unavailable-view-model.js'
import { metadata } from '~/test/fixtures/form.js'

describe('unavailableViewModel', () => {
  it('should return the correct view model with basic metadata', () => {
    const result = unavailableViewModel(metadata)
    expect(result).toEqual({
      pageTitle: 'Sorry, this form is unavailable',
      formTitle: 'Test form',
      organisationName: 'Defra',
      phoneLines: undefined
    })
  })

  it('should strip the organisation suffix if present', () => {
    const result = unavailableViewModel({
      ...metadata,
      organisation: 'Rural Payments Agency – RPA'
    } as FormMetadata)
    expect(result.organisationName).toBe('the Rural Payments Agency')
  })
})
