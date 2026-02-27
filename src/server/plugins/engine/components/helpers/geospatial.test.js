import { validState } from '~/src/server/plugins/engine/components/helpers/__stubs__/geospatial.js'
import { geospatialSchema } from '~/src/server/plugins/engine/components/helpers/geospatial.js'

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

    expect(result.error).toBeUndefined()
    expect(result.value).toEqual([])
  })
})
