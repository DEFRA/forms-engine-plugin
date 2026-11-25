import { CY, EN_GB } from '~/src/server/constants.js'
import { unavailableViewModel } from '~/src/server/plugins/engine/models/unavailable-view-model.js'
import { metadata } from '~/test/fixtures/form.js'

describe('unavailableViewModel', () => {
  it('should return the correct view model with basic metadata', () => {
    const result = unavailableViewModel(metadata, undefined, EN_GB)
    expect(result).toEqual({
      pageTitle: 'Sorry, this form is unavailable',
      formTitle: 'Test form',
      language: 'en-GB',
      languages: [
        { code: 'en-GB', name: 'English' },
        { code: 'cy', name: 'Cymraeg' }
      ],
      organisationName: 'Defra',
      contact: undefined,
      context: expect.any(Object)
    })
  })

  it('should handle Welsh', () => {
    const result = unavailableViewModel(metadata, undefined, CY)
    expect(result).toEqual({
      pageTitle: "Mae'n ddrwg gennyf, nid yw'r ffurflen hon ar gael",
      formTitle: 'Test form',
      language: 'cy',
      languages: [
        { code: 'en-GB', name: 'English' },
        { code: 'cy', name: 'Cymraeg' }
      ],
      organisationName: 'Defra',
      contact: undefined,
      context: expect.any(Object)
    })
  })
})
