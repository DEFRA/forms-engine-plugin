import {
  FormStatus,
  type FormDefinition,
  type FormMetadata
} from '@defra/forms-model'

import { getCachedPluginTranslator } from '~/src/server/plugins/engine/i18n/form.js'
import { type AnyFormRequest } from '~/src/server/plugins/engine/types.js'
import englishDefinition from '~/test/form/definitions/basic.js'
import welshDefinition from '~/test/form/definitions/fields-required-translated.js'

function buildRequest(definition: FormDefinition) {
  return {
    server: {
      plugins: { 'forms-engine-plugin': {} },
      app: { model: { def: definition } }
    }
  } as unknown as AnyFormRequest
}

describe('getCachedPluginTranslator', () => {
  it('uses Welsh when the form has Welsh translations', async () => {
    const translator = await getCachedPluginTranslator(
      buildRequest(welshDefinition),
      { id: 'welsh-form' } as FormMetadata,
      FormStatus.Draft,
      'cy'
    )

    expect(translator.language).toBe('cy')
    expect(translator.t('postcodeLookup.findAddress')).toBe(
      'Dod o hyd i gyfeiriad'
    )
  })

  it('uses English when the form has no Welsh translations', async () => {
    const translator = await getCachedPluginTranslator(
      buildRequest(englishDefinition),
      { id: 'english-form' } as FormMetadata,
      FormStatus.Draft,
      'cy'
    )

    expect(translator.language).toBe('en-GB')
    expect(translator.t('postcodeLookup.findAddress')).toBe('Find address')
  })
})
