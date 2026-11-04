import {
  ComponentType,
  GeospatialFieldOptionsCountryEnum
} from '@defra/forms-model'

import { validState } from '~/src/server/plugins/engine/components/helpers/__stubs__/geospatial.js'
import { getGeospatialSchema } from '~/src/server/plugins/engine/components/helpers/geospatial.js'

/**
 * @type {import('@defra/forms-model').GeospatialFieldComponent}
 */
const geospatialComponent = {
  name: 'geospatial',
  title: 'Geospatial',
  type: ComponentType.GeospatialField,
  options: {}
}

const geospatialSchema = getGeospatialSchema(geospatialComponent)

describe('Geospatial validation helpers', () => {
  test('it should not have errors for valid geojson object', () => {
    const result = geospatialSchema.validate(validState)

    expect(result.error).toBeUndefined()
    expect(result.value).toBeDefined()
    expect(result.value).toHaveLength(4)
  })

  test('it should not have errors for valid geojson string', () => {
    const result = geospatialSchema.validate(JSON.stringify(validState))

    expect(result.error).toBeUndefined()
    expect(result.value).toBeDefined()
    expect(result.value).toHaveLength(4)
  })

  test('it should have errors for invalid json string', () => {
    const result = geospatialSchema.validate('{')

    expect(result.error).toBeDefined()
    expect(result.value).toBe('{')
  })

  test('it should have errors for invalid geojson string', () => {
    const result = geospatialSchema.validate('[')

    expect(result.error).toBeDefined()
    expect(result.value).toBe('[')
  })

  test('it should validate an empty array', () => {
    const result = geospatialSchema.validate('[]')

    expect(result.error).toBeDefined()
    expect(result.value).toBeUndefined()
  })

  test('it should validate an empty array when optional', () => {
    const schema = getGeospatialSchema({
      ...geospatialComponent,
      options: { required: false }
    })
    const result = schema.validate('[]')

    expect(result.error).toBeUndefined()
    expect(result.value).toBeUndefined()
  })

  test('it should not validate an empty object', () => {
    const result = geospatialSchema.validate('{}')

    expect(result.error).toBeDefined()
    expect(result.value).toBeUndefined()
  })

  test('it should validate an empty string', () => {
    const result = geospatialSchema.validate('')

    expect(result.error).toBeDefined()
    expect(result.value).toBeUndefined()
  })

  test('it should be valid inside country bounds', () => {
    const schema = getGeospatialSchema({
      ...geospatialComponent,
      options: { countries: [GeospatialFieldOptionsCountryEnum.England] }
    })

    expect(schema.validate(validState).error).toBeUndefined()
    expect(schema.validate(validState.slice(1)).error).toBeUndefined()
    expect(schema.validate(validState.slice(2)).error).toBeUndefined()
    expect(schema.validate(validState.slice(3)).error).toBeUndefined()
  })

  test('it should be invalid outside country bounds', () => {
    const schema = getGeospatialSchema({
      ...geospatialComponent,
      options: { countries: [GeospatialFieldOptionsCountryEnum.Scotland] }
    })

    expect(schema.validate(validState).error).toBeDefined()
    expect(schema.validate(validState.slice(1)).error).toBeDefined()
    expect(schema.validate(validState.slice(2)).error).toBeDefined()
    expect(schema.validate(validState.slice(3)).error).toBeDefined()
  })

  test('it should be invalid when a line leaves the country between its points', () => {
    const schema = getGeospatialSchema({
      ...geospatialComponent,
      options: { countries: [GeospatialFieldOptionsCountryEnum.England] }
    })
    const [feature] = validState

    /**
     * @param {number[][]} coordinates
     */
    const lineFeature = (coordinates) => ({
      ...feature,
      geometry: { type: 'LineString', coordinates }
    })

    const insideEngland = lineFeature([
      [-1.1, 53.9],
      [-1, 54],
      [-0.9, 54.05]
    ])
    const acrossWales = lineFeature([
      [-2.99, 53.4],
      [-3.48, 51.2]
    ])

    expect(schema.validate([insideEngland]).error).toBeUndefined()
    expect(schema.validate([acrossWales]).error).toBeDefined()
  })

  test('it should be valid with no country bounds', () => {
    const schema = getGeospatialSchema(geospatialComponent)

    expect(schema.validate(validState).error).toBeUndefined()
  })
})
