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
    })
    expect(result.organisationName).toBe('Rural Payments Agency')
  })

  it('should handle multiple phone lines correctly', () => {
    const result = unavailableViewModel({
      ...metadata,
      contact: {
        phone: '01234 567 890\n09876 543 210'
      }
    })
    expect(result.phoneLines).toEqual(['01234 567 890', '09876 543 210'])
  })

  it('should filter out empty phone lines and trim whitespace', () => {
    const result = unavailableViewModel({
      ...metadata,
      contact: {
        phone: '  01234 567 890  \n  \n  09876 543 210  '
      }
    })
    expect(result.phoneLines).toEqual(['01234 567 890', '09876 543 210'])
  })

  it('should return undefined if phone is empty or only whitespace', () => {
    const result = unavailableViewModel({
      ...metadata,
      contact: {
        phone: ' \n '
      }
    })
    expect(result.phoneLines).toBeUndefined()
  })

  it('should handle missing contact property', () => {
    const result = unavailableViewModel({
      ...metadata,
      contact: undefined
    })
    expect(result.phoneLines).toBeUndefined()
  })
})
