import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { lineString, multiLineString } from '@turf/helpers'
import { lineSplit } from '@turf/line-split'
import Flatbush from 'flatbush'
import {
  type Feature,
  type FeatureCollection,
  type Geometry,
  type MultiPolygon,
  type Polygon,
  type Position
} from 'geojson'
import { orient2d } from 'robust-predicates'

const boundariesFilePath = resolve(
  import.meta.dirname,
  './routes/vts/countries-5dp.geojson'
)

/**
 * Number of boundary edges grouped under one entry in the spatial index.
 * Consecutive edges of a ring sit close together, so the groups stay compact
 * while keeping the index far smaller than one entry per edge.
 */
const EDGES_PER_GROUP = 32

const INSIDE = 1
const OUTSIDE = -1
const ON_BOUNDARY = 0

export interface CountryBoundary {
  contains: (geometry: Geometry) => boolean
}

/**
 * Creates a check for whether a geometry is within a boundary. It returns the
 * same answers as turf's booleanWithin, but only visits the edges near the
 * geometry. The check runs synchronously on the main thread during validation,
 * and turf visits every edge, which takes seconds to minutes for a detailed
 * boundary and stops the service answering requests.
 *
 * Coordinates are held in a typed array, which uses far less memory than the
 * parsed GeoJSON, so the GeoJSON can be released after this returns.
 */
export function createCountryBoundary(
  feature: Feature<Polygon | MultiPolygon>
): CountryBoundary {
  const { geometry } = feature
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

  const rings = polygons.flat()
  const vertexCount = rings.reduce((total, ring) => total + ring.length, 0)
  const groupCount = rings.reduce(
    (total, ring) => total + Math.ceil((ring.length - 1) / EDGES_PER_GROUP),
    0
  )

  const coordinates = new Float64Array(vertexCount * 2)
  const groupStarts = new Uint32Array(groupCount)
  const groupEdges = new Uint8Array(groupCount)
  const groupPolygons = new Uint32Array(groupCount)
  const index = new Flatbush(groupCount)

  let minLng = Infinity
  let vertex = 0
  let group = 0

  polygons.forEach((polygonRings, polygonIndex) => {
    for (const ring of polygonRings) {
      const ringStart = vertex

      for (const [lng, lat] of ring) {
        coordinates[vertex * 2] = lng
        coordinates[vertex * 2 + 1] = lat
        vertex++
      }

      for (let edge = 0; edge < ring.length - 1; edge += EDGES_PER_GROUP) {
        const edges = Math.min(EDGES_PER_GROUP, ring.length - 1 - edge)
        const start = ringStart + edge

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (let i = start; i <= start + edges; i++) {
          const x = coordinates[i * 2]
          const y = coordinates[i * 2 + 1]
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }

        minLng = Math.min(minLng, minX)
        groupStarts[group] = start
        groupEdges[group] = edges
        groupPolygons[group] = polygonIndex
        index.add(minX, minY, maxX, maxY)
        group++
      }
    }
  })

  index.finish()

  /**
   * Ray casting along the same rules as turf's booleanPointInPolygon, which
   * counts edges to the left of the point separately for each polygon. Only
   * edges that the ray can touch need to be visited.
   */
  function locate(lng: number, lat: number) {
    const crossings = new Map<number, number>()

    for (const found of index.search(minLng, lat, lng, lat)) {
      const start = groupStarts[found]
      const polygonIndex = groupPolygons[found]
      let count = crossings.get(polygonIndex) ?? 0

      let u1 = coordinates[start * 2] - lng
      let v1 = coordinates[start * 2 + 1] - lat

      for (let i = start + 1; i <= start + groupEdges[found]; i++) {
        const u2 = coordinates[i * 2] - lng
        const v2 = coordinates[i * 2 + 1] - lat

        if (v1 === 0 && v2 === 0) {
          if ((u2 <= 0 && u1 >= 0) || (u1 <= 0 && u2 >= 0)) {
            return ON_BOUNDARY
          }
        } else if ((v2 >= 0 && v1 <= 0) || (v2 <= 0 && v1 >= 0)) {
          const orientation = orient2d(u1, u2, v1, v2, 0, 0)

          if (orientation === 0) {
            return ON_BOUNDARY
          }

          if (
            (orientation > 0 && v2 > 0 && v1 <= 0) ||
            (orientation < 0 && v2 <= 0 && v1 > 0)
          ) {
            count++
          }
        }

        u1 = u2
        v1 = v2
      }

      crossings.set(polygonIndex, count)
    }

    for (const count of crossings.values()) {
      if (count % 2 === 1) {
        return INSIDE
      }
    }

    return OUTSIDE
  }

  /**
   * Boundary edges near a line segment, as lines to split the segment with
   */
  function nearbyEdges(
    [startLng, startLat]: Position,
    [endLng, endLat]: Position
  ) {
    return index
      .search(
        Math.min(startLng, endLng),
        Math.min(startLat, endLat),
        Math.max(startLng, endLng),
        Math.max(startLat, endLat)
      )
      .map((found) => {
        const line: Position[] = []
        const start = groupStarts[found]

        for (let i = start; i <= start + groupEdges[found]; i++) {
          line.push([coordinates[i * 2], coordinates[i * 2 + 1]])
        }

        return line
      })
  }

  const isInsideOrOnBoundary = ([lng, lat]: Position) =>
    locate(lng, lat) !== OUTSIDE

  /**
   * Splits a line where it meets the boundary, then checks each piece, so a
   * line with every vertex inside can't pass if it leaves the boundary between
   * them. At least one piece has to be strictly inside, as a line that only
   * runs along the boundary isn't within it.
   */
  function containsLine(line: Position[]) {
    if (!line.every(isInsideOrOnBoundary)) {
      return false
    }

    let isStrictlyInside = false

    for (let i = 0; i < line.length - 1; i++) {
      const segment = lineString([line[i], line[i + 1]])
      const edges = nearbyEdges(line[i], line[i + 1])
      const split = edges.length
        ? lineSplit(segment, multiLineString(edges))
        : undefined
      const pieces = split?.features.length ? split.features : [segment]

      for (const piece of pieces) {
        const [start, end] = piece.geometry.coordinates
        const location = locate(
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2
        )

        if (location === OUTSIDE) {
          return false
        }

        isStrictlyInside ||= location === INSIDE
      }
    }

    return isStrictlyInside
  }

  return {
    contains(geometry) {
      switch (geometry.type) {
        case 'Point':
          return (
            locate(geometry.coordinates[0], geometry.coordinates[1]) === INSIDE
          )
        case 'LineString':
          return containsLine(geometry.coordinates)
        case 'Polygon':
          return geometry.coordinates[0].every(isInsideOrOnBoundary)
        default:
          throw new Error(`${geometry.type} geometry not supported`)
      }
    }
  }
}

let boundaries: Map<unknown, CountryBoundary> | undefined

/**
 * Gets the full resolution boundary for a country. The file is only read when
 * a form first needs a country check, so services without one don't pay for it.
 * @param id - the feature id from CountryMap
 */
export function getCountryBoundary(id: number) {
  boundaries ??= new Map(
    (
      JSON.parse(readFileSync(boundariesFilePath, 'utf8')) as FeatureCollection<
        Polygon | MultiPolygon
      >
    ).features.map((feature) => [feature.id, createCountryBoundary(feature)])
  )

  return boundaries.get(id)
}
