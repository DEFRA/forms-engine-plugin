import {
  countries,
  countriesValidate
} from '~/src/server/plugins/map/routes/index.js'

describe('Map routes', () => {
  it('uses the display GeoJSON for validation during Jest runs', () => {
    expect(countriesValidate).toEqual(countries)
  })
})
