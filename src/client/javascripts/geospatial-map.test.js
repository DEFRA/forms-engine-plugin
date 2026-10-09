import { getFeaturesManager } from '~/src/client/javascripts/geospatial-map.js'

/**
 * @param {string} id
 * @param {Geometry} geometry
 * @returns {Feature}
 */
function buildFeature(id, geometry) {
  return {
    id,
    type: 'Feature',
    properties: {
      description: 'Survey location',
      coordinateGridReference: '',
      centroidGridReference: ''
    },
    geometry
  }
}

/*
 * DF-1497: `updateFeature` writes both grid references before it applies the
 * new geometry, so after a feature is updated the grid references still
 * describe where the feature used to be. The three `updateFeature` grid
 * reference tests below fail until that ordering is corrected.
 */
describe('getFeaturesManager', () => {
  /** @type {GeoJSON} */
  let geojson

  beforeEach(() => {
    geojson = { type: 'FeatureCollection', features: [] }
  })

  describe('addFeature', () => {
    it('stores grid references for the added geometry', () => {
      const { addFeature } = getFeaturesManager(geojson)

      addFeature(
        buildFeature('1', {
          type: 'Point',
          coordinates: [-0.1329571, 51.5027075]
        })
      )

      expect(geojson.features[0].properties).toEqual(
        expect.objectContaining({
          coordinateGridReference: 'TQ 29684 79849',
          centroidGridReference: 'TQ 29684 79849'
        })
      )
    })
  })

  describe('updateFeature', () => {
    it('recalculates the grid references of an updated point', () => {
      const { addFeature, updateFeature } = getFeaturesManager(geojson)

      addFeature(
        buildFeature('1', {
          type: 'Point',
          coordinates: [-0.1329571, 51.5027075]
        })
      )

      updateFeature('1', {
        type: 'Point',
        coordinates: [-0.1497151, 51.5025274]
      })

      expect(geojson.features[0].properties).toEqual(
        expect.objectContaining({
          coordinateGridReference: 'TQ 28521 79799',
          centroidGridReference: 'TQ 28521 79799'
        })
      )
    })

    it('recalculates the grid references of an updated line', () => {
      const { addFeature, updateFeature } = getFeaturesManager(geojson)

      addFeature(
        buildFeature('1', {
          type: 'LineString',
          coordinates: [
            [-0.1329571, 51.5027075],
            [-0.1324662, 51.5006911]
          ]
        })
      )

      updateFeature('1', {
        type: 'LineString',
        coordinates: [
          [-0.1497151, 51.5025274],
          [-0.1404592, 51.5022288]
        ]
      })

      const { properties } = geojson.features[0]

      // First point of the new line
      expect(properties.coordinateGridReference).toBe('TQ 28521 79799')
      // Midpoint of the new line (-0.14508715, 51.5023781)
      expect(properties.centroidGridReference).toBe('TQ 28843 79791')
    })

    it('recalculates the grid references of an updated shape', () => {
      const { addFeature, updateFeature } = getFeaturesManager(geojson)

      addFeature(
        buildFeature('1', {
          type: 'Polygon',
          coordinates: [
            [
              [-0.1430274, 51.5012331],
              [-0.1424662, 51.5006911],
              [-0.1416921, 51.5010163],
              [-0.1430274, 51.5012331]
            ]
          ]
        })
      )

      updateFeature('1', {
        type: 'Polygon',
        coordinates: [
          [
            [-0.1497151, 51.5025274],
            [-0.1404592, 51.5022288],
            [-0.1400755, 51.5020198],
            [-0.1497151, 51.5025274]
          ]
        ]
      })

      const { properties } = geojson.features[0]

      // First corner of the new shape
      expect(properties.coordinateGridReference).toBe('TQ 28521 79799')
      // Centroid of the three distinct corners (-0.1434166, 51.5022587)
      expect(properties.centroidGridReference).toBe('TQ 28959 79780')
    })

    it('reduces the precision of the updated geometry to 7 decimal places', () => {
      const { addFeature, updateFeature } = getFeaturesManager(geojson)

      addFeature(
        buildFeature('1', {
          type: 'Point',
          coordinates: [-0.1329571, 51.5027075]
        })
      )

      updateFeature('1', {
        type: 'Point',
        coordinates: [-0.14971510866865856, 51.50252738875241]
      })

      expect(geojson.features[0].geometry.coordinates).toEqual([
        -0.1497151, 51.5025274
      ])
    })

    it('returns undefined and changes nothing when the feature is unknown', () => {
      const { addFeature, updateFeature } = getFeaturesManager(geojson)

      addFeature(
        buildFeature('1', {
          type: 'Point',
          coordinates: [-0.1329571, 51.5027075]
        })
      )

      const result = updateFeature('unknown', {
        type: 'Point',
        coordinates: [-0.1497151, 51.5025274]
      })

      expect(result).toBeUndefined()
      expect(geojson.features[0].properties.coordinateGridReference).toBe(
        'TQ 29684 79849'
      )
    })
  })
})

/**
 * @import { GeoJSON } from '~/src/client/javascripts/geospatial-map.js'
 * @import { Feature, Geometry } from '~/src/server/plugins/engine/types.js'
 */
