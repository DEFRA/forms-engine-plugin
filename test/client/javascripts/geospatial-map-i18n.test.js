import { getTexts } from '~/src/client/javascripts/geospatial-map.js'
import {
  ENGLISH_LANG,
  WELSH_LANG
} from '~/src/client/javascripts/map-constants.js'
import cy from '~/src/server/plugins/engine/i18n/translations/cy.json' with { type: 'json' }
import enGB from '~/src/server/plugins/engine/i18n/translations/en-GB.json' with { type: 'json' }

describe('geospatial map translations', () => {
  it('uses the shared server translation values for the English map UI', () => {
    const texts = getTexts(ENGLISH_LANG)

    expect(texts.helpPanel.label).toBe(
      enGB.components.geospatialField.map.helpPanel.label
    )
    expect(texts.buttons.point).toBe(
      enGB.components.geospatialField.map.buttons.point
    )
  })

  it('uses the shared server translation values for the Welsh map UI', () => {
    const texts = getTexts(WELSH_LANG)

    expect(texts.helpPanel.label).toBe(
      cy.components.geospatialField.map.helpPanel.label
    )
    expect(texts.buttons.point).toBe(
      cy.components.geospatialField.map.buttons.point
    )
  })
})
