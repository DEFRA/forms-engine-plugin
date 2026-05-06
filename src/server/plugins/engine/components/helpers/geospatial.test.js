import { GeospatialFieldOptionsCountryEnum } from '@defra/forms-model'

import { validState } from '~/src/server/plugins/engine/components/helpers/__stubs__/geospatial.js'
import { getGeospatialSchema } from '~/src/server/plugins/engine/components/helpers/geospatial.js'

const geospatialSchema = getGeospatialSchema()

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

    expect(result.error).toBeUndefined()
    expect(result.value).toEqual([])
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
    const schema = getGeospatialSchema(
      GeospatialFieldOptionsCountryEnum.England
    )

    expect(schema.validate(validState).error).toBeUndefined()
    expect(schema.validate(validState.slice(1)).error).toBeUndefined()
    expect(schema.validate(validState.slice(2)).error).toBeUndefined()
    expect(schema.validate(validState.slice(3)).error).toBeUndefined()
  })

  test('it should be invalid outside country bounds', () => {
    const schema = getGeospatialSchema(
      GeospatialFieldOptionsCountryEnum.Scotland
    )

    expect(schema.validate(validState).error).toBeDefined()
    expect(schema.validate(validState.slice(1)).error).toBeDefined()
    expect(schema.validate(validState.slice(2)).error).toBeDefined()
    expect(schema.validate(validState.slice(3)).error).toBeDefined()
  })

  test('it should be valid with no country bounds', () => {
    const schema = getGeospatialSchema()

    expect(schema.validate(validState).error).toBeUndefined()
  })
})
