import { centroid } from '@turf/centroid'
import { polygon } from '@turf/helpers'
// @ts-expect-error - no types
import { LatLon } from 'geodesy/osgridref.js'

import { type Feature } from '~/src/server/plugins/engine/types.js'

export function getGridRef(feature: Feature) {
  if (feature.geometry.type === 'Point') {
    const [long, lat] = feature.geometry.coordinates
    const point = new LatLon(lat, long)

    return point.toOsGrid()
  }

  if (feature.geometry.type === 'LineString') {
    const [long1, lat1] = feature.geometry.coordinates[0]
    const point1 = new LatLon(lat1, long1)

    const numLinePoints = feature.geometry.coordinates.length
    const [long2, lat2] = feature.geometry.coordinates[numLinePoints - 1]
    const point2 = new LatLon(lat2, long2)

    return `${point1.toOsGrid()} to ${point2.toOsGrid()}`
  }

  const shape = polygon(feature.geometry.coordinates)
  const centre = centroid(shape)
  const [long, lat] = centre.geometry.coordinates
  const point = new LatLon(lat, long)

  return point.toOsGrid()
}
