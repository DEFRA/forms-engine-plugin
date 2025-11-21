import { FormStatus } from '@defra/forms-model'

import {
  getFormDefinition,
  getFormMetadata,
  getFormMetadataById
} from '~/src/server/plugins/engine/services/formsService.js'

describe('formsService', () => {
  it('getFormMetadata should throw error', () => {
    expect(() => getFormMetadata('slug')).toThrow()
  })

  it('getFormMetadataById should throw error', () => {
    expect(() => getFormMetadataById('id')).toThrow()
  })

  it('getFormDefinition should throw error', () => {
    expect(() => getFormDefinition('id', FormStatus.Draft)).toThrow()
  })
})
