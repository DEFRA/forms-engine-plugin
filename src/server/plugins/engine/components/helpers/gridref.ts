import { centroid } from '@turf/centroid'
// @ts-expect-error - no types
import { LatLon } from 'geodesy/osgridref.js'

import { type Feature } from '~/src/server/plugins/engine/types.js'

export function getGridRef(feature: Feature) {
  if (feature.geometry.type === 'Point') {
    const [long, lat] = feature.geometry.coordinates
    const point = new LatLon(lat, long)

    return point.toOsGrid().toString()
  }

  const centre = centroid(feature)
  const [long, lat] = centre.geometry.coordinates
  const point = new LatLon(lat, long)

  return point.toOsGrid().toString()
}
