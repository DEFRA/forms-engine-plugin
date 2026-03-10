import { getGridRef } from '~/src/server/plugins/engine/components/helpers/gridref.js'

describe('Gridref helpers', () => {
  test('it should return gridref for a point feature', () => {
    const result = getGridRef({
      id: 'id',
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-0.1356213, 51.5121161]
      },
      properties: {
        description: 'New point'
      }
    })

    expect(result).toBe('TQ 29472 80890')
  })

  test('it should return gridref for a linestring feature', () => {
    const result = getGridRef({
      id: 'id',
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.1356213, 51.5121161],
          [-0.0578579, 51.5182996]
        ]
      },
      properties: {
        description: 'New line'
      }
    })

    expect(result).toBe('TQ 29472 80890 to TQ 34850 81718')
  })

  test('it should return gridref for a polygon feature', () => {
    const result = getGridRef({
      id: 'id',
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.1356213, 51.5121161],
            [-0.0578579, 51.5182996],
            [-0.1114282, 51.5602178],
            [-0.1356213, 51.5121161]
          ]
        ]
      },
      properties: {
        description: 'New polygon'
      }
    })

    expect(result).toBe('TQ 31778 82963')
  })
})
