import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { booleanWithin } from '@turf/boolean-within'
import { type Feature, type Geometry, type MultiPolygon } from 'geojson'

import {
  createCountryBoundary,
  getCountryBoundary
} from '~/src/server/plugins/map/country-boundary.js'
import { CountryMap } from '~/src/server/plugins/map/types.js'

const ENGLAND = CountryMap.england
const SCOTLAND = CountryMap.scotland

const point = (lng: number, lat: number): Geometry => ({
  type: 'Point',
  coordinates: [lng, lat]
})

const line = (...coordinates: number[][]): Geometry => ({
  type: 'LineString',
  coordinates
})

const polygon = (...ring: number[][]): Geometry => ({
  type: 'Polygon',
  coordinates: [ring]
})

const circle = (lng: number, lat: number, radius: number, vertices: number) => {
  const ring = Array.from({ length: vertices }, (_, i) => {
    const angle = (2 * Math.PI * i) / vertices
    return [
      lng + radius * Math.cos(angle),
      lat + (radius / 2) * Math.sin(angle)
    ]
  })

  return [...ring, ring[0]]
}

const york = [-1.08, 53.96]
const liverpool = [-2.99, 53.4]
const minehead = [-3.48, 51.2]

/**
 * Small seeded generator so a failure can be reproduced
 */
function createRandom(seed: number) {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

describe('country boundary', () => {
  describe('createCountryBoundary', () => {
    const square: Feature<MultiPolygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0]
            ],
            [
              [4, 4],
              [6, 4],
              [6, 6],
              [4, 6],
              [4, 4]
            ]
          ],
          [
            [
              [20, 0],
              [30, 0],
              [30, 10],
              [20, 10],
              [20, 0]
            ]
          ]
        ]
      }
    }
    const boundary = createCountryBoundary(square)

    it.each([
      ['a point inside', point(1, 1), true],
      ['a point in the second polygon', point(25, 5), true],
      ['a point in a hole', point(5, 5), false],
      ['a point outside', point(15, 5), false],
      ['a point on the outer edge', point(0, 5), false],
      ['a point on a vertex', point(0, 0), false],
      ['a point on the edge of a hole', point(4, 5), false],
      ['a line inside', line([1, 1], [2, 3], [3, 1]), true],
      ['a line with a vertex outside', line([1, 1], [15, 5]), false],
      ['a line crossing a hole', line([1, 5], [9, 5]), false],
      ['a line crossing between polygons', line([9, 5], [21, 5]), false],
      ['a line along the outer edge', line([0, 0], [10, 0]), false],
      ['a polygon inside', polygon([1, 1], [2, 1], [2, 2], [1, 1]), true],
      [
        'a polygon with a vertex outside',
        polygon([1, 1], [15, 1], [1, 2], [1, 1]),
        false
      ]
    ])('matches expected result for %s', (_, geometry, expected) => {
      expect(boundary.contains(geometry)).toBe(expected)
      expect(booleanWithin(geometry, square)).toBe(expected)
    })
  })

  describe('compared with turf on simplified boundaries', () => {
    const { features } = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, './routes/vts/countries.geojson'),
        'utf8'
      )
    ) as { features: Feature<MultiPolygon>[] }

    const random = createRandom(42)
    const randomCoordinate = () => [-8 + random() * 10, 50 + random() * 9]

    it.each(features.map((feature) => [feature.id, feature] as const))(
      'gives the same answer as turf for country %s',
      (_, feature) => {
        const boundary = createCountryBoundary(feature)

        for (let i = 0; i < 500; i++) {
          const start = randomCoordinate()
          const end = [
            start[0] + (random() - 0.5) * 0.5,
            start[1] + (random() - 0.5) * 0.5
          ]
          const middle = [(start[0] + end[0]) / 2, end[1]]

          for (const geometry of [
            point(start[0], start[1]),
            line(start, middle, end),
            polygon(start, middle, end, start)
          ]) {
            expect({
              geometry,
              within: boundary.contains(geometry)
            }).toEqual({
              geometry,
              within: booleanWithin(geometry, feature)
            })
          }
        }
      }
    )

    it('gives the same answer as turf for points on boundary vertices', () => {
      const [feature] = features
      const boundary = createCountryBoundary(feature)
      const ring = feature.geometry.coordinates[0][0]

      for (const [lng, lat] of ring.slice(0, 200)) {
        const geometry = point(lng, lat)

        expect(boundary.contains(geometry)).toBe(
          booleanWithin(geometry, feature)
        )
      }
    })
  })

  describe('getCountryBoundary', () => {
    it.each([
      ['a point in England', ENGLAND, point(york[0], york[1]), true],
      ['a point in Scotland', ENGLAND, point(-3.52, 58.59), false],
      ['a point in France', ENGLAND, point(2.35, 48.85), false],
      ['a point in Scotland', SCOTLAND, point(-3.52, 58.59), true],
      [
        'a line in Yorkshire',
        ENGLAND,
        line([-1.1, 53.9], [-1, 54], [-0.9, 54.05]),
        true
      ],
      [
        'a line with both ends in England that crosses Wales',
        ENGLAND,
        line(liverpool, minehead),
        false
      ],
      [
        'a polygon in Yorkshire',
        ENGLAND,
        polygon([-1.1, 53.9], [-1, 53.9], [-1, 54], [-1.1, 53.9]),
        true
      ]
    ])('checks %s against the full boundary', (_, id, geometry, expected) => {
      expect(getCountryBoundary(id)?.contains(geometry)).toBe(expected)
    })

    it('returns undefined for an unknown country', () => {
      expect(getCountryBoundary(99)).toBeUndefined()
    })

    it('keeps long lines and large polygons fast enough not to fail health checks', () => {
      const boundary = getCountryBoundary(ENGLAND)
      const coordinates = Array.from({ length: 30 }, (_, i) => [
        -1.1 + (0.2 * i) / 30,
        53.9 + (0.15 * i) / 30
      ])

      const started = performance.now()

      expect(boundary?.contains(line(...coordinates))).toBe(true)
      expect(boundary?.contains(polygon(...circle(-1, 53.95, 0.05, 200)))).toBe(
        true
      )

      expect(performance.now() - started).toBeLessThan(1000)
    })
  })
})
