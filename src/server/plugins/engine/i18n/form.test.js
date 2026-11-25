import { FormStatus } from '@defra/forms-model'

import { getCachedPluginTranslator } from '~/src/server/plugins/engine/i18n/form.js'
import englishDefinition from '~/test/form/definitions/basic.js'
import welshDefinition from '~/test/form/definitions/fields-required-translated.js'

/**
 * @param {FormDefinition} definition
 */
function buildRequest(definition) {
  return /** @type {AnyFormRequest} */ (
    /** @type {unknown} */ ({
      server: {
        plugins: { 'forms-engine-plugin': {} },
        app: { model: { def: definition } }
      }
    })
  )
}

describe('getCachedPluginTranslator', () => {
  it('uses Welsh when the form has Welsh translations', async () => {
    const translator = await getCachedPluginTranslator(
      buildRequest(welshDefinition),
      /** @type {FormMetadata} */ ({ id: 'welsh-form' }),
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
      /** @type {FormMetadata} */ ({ id: 'english-form' }),
      FormStatus.Draft,
      'cy'
    )

    expect(translator.language).toBe('en-GB')
    expect(translator.t('postcodeLookup.findAddress')).toBe('Find address')
  })
})

/**
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 * @import { AnyFormRequest } from '~/src/server/plugins/engine/types.js'
 */
