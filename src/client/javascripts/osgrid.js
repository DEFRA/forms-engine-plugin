/**
 *
 * @param {*} gridref
 * @returns
 */
export function osGridToLatLong(gridref) {
  const E = gridref.easting
  const N = gridref.northing

  const a = 6377563.396
  const b = 6356256.91 // Airy 1830 major & minor semi-axes
  const F0 = 0.9996012717 // NatGrid scale factor on central meridian
  const lat0 = (49 * Math.PI) / 180
  const lon0 = (-2 * Math.PI) / 180 // NatGrid true origin
  const N0 = -100000
  const E0 = 400000 // northing & easting of true origin, metres
  const e2 = 1 - (b * b) / (a * a) // eccentricity squared
  const n = (a - b) / (a + b)
  const n2 = n * n
  const n3 = n * n * n

  let lat = lat0
  let M = 0
  do {
    lat = (N - N0 - M) / (a * F0) + lat

    const Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (lat - lat0)
    const Mb =
      (3 * n + 3 * n * n + (21 / 8) * n3) *
      Math.sin(lat - lat0) *
      Math.cos(lat + lat0)
    const Mc =
      ((15 / 8) * n2 + (15 / 8) * n3) *
      Math.sin(2 * (lat - lat0)) *
      Math.cos(2 * (lat + lat0))
    const Md =
      (35 / 24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0))
    M = b * F0 * (Ma - Mb + Mc - Md) // meridional arc
  } while (N - N0 - M >= 0.00001) // ie until < 0.01mm

  const cosLat = Math.cos(lat)
  const sinLat = Math.sin(lat)
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinLat * sinLat) // transverse radius of curvature
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinLat * sinLat, 1.5) // meridional radius of curvature
  const eta2 = nu / rho - 1

  const tanLat = Math.tan(lat)
  const tan2lat = tanLat * tanLat
  const tan4lat = tan2lat * tan2lat
  const tan6lat = tan4lat * tan2lat
  const secLat = 1 / cosLat
  const nu3 = nu * nu * nu
  const nu5 = nu3 * nu * nu
  const nu7 = nu5 * nu * nu
  const VII = tanLat / (2 * rho * nu)
  const VIII =
    (tanLat / (24 * rho * nu3)) * (5 + 3 * tan2lat + eta2 - 9 * tan2lat * eta2)
  const IX = (tanLat / (720 * rho * nu5)) * (61 + 90 * tan2lat + 45 * tan4lat)
  const X = secLat / nu
  const XI = (secLat / (6 * nu3)) * (nu / rho + 2 * tan2lat)
  const XII = (secLat / (120 * nu5)) * (5 + 28 * tan2lat + 24 * tan4lat)
  const XIIA =
    (secLat / (5040 * nu7)) *
    (61 + 662 * tan2lat + 1320 * tan4lat + 720 * tan6lat)

  const dE = E - E0
  const dE2 = dE * dE
  const dE3 = dE2 * dE
  const dE4 = dE2 * dE2
  const dE5 = dE3 * dE2
  const dE6 = dE4 * dE2
  const dE7 = dE5 * dE2
  lat = lat - VII * dE2 + VIII * dE4 - IX * dE6
  const lon = lon0 + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7

  return { lat: toDeg(lat), long: toDeg(lon) }
}

/**
 *
 * @param {*} point
 * @returns
 */
export function latLongToOsGrid(point) {
  const lat = toRad(point.lat)
  const lon = toRad(point.long)

  const a = 6377563.396
  const b = 6356256.91 // Airy 1830 major & minor semi-axes
  const F0 = 0.9996012717 // NatGrid scale factor on central meridian
  const lat0 = toRad(49)
  const lon0 = toRad(-2) // NatGrid true origin is 49ºN,2ºW
  const N0 = -100000
  const E0 = 400000 // northing & easting of true origin, metres
  const e2 = 1 - (b * b) / (a * a) // eccentricity squared
  const n = (a - b) / (a + b)
  const n2 = n * n
  const n3 = n * n * n

  const cosLat = Math.cos(lat)
  const sinLat = Math.sin(lat)
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinLat * sinLat) // transverse radius of curvature
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinLat * sinLat, 1.5) // meridional radius of curvature
  const eta2 = nu / rho - 1

  const Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (lat - lat0)
  const Mb =
    (3 * n + 3 * n * n + (21 / 8) * n3) *
    Math.sin(lat - lat0) *
    Math.cos(lat + lat0)
  const Mc =
    ((15 / 8) * n2 + (15 / 8) * n3) *
    Math.sin(2 * (lat - lat0)) *
    Math.cos(2 * (lat + lat0))
  const Md =
    (35 / 24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0))
  const M = b * F0 * (Ma - Mb + Mc - Md) // meridional arc

  const cos3lat = cosLat * cosLat * cosLat
  const cos5lat = cos3lat * cosLat * cosLat
  const tan2lat = Math.tan(lat) * Math.tan(lat)
  const tan4lat = tan2lat * tan2lat

  const I = M + N0
  const II = (nu / 2) * sinLat * cosLat
  const III = (nu / 24) * sinLat * cos3lat * (5 - tan2lat + 9 * eta2)
  const IIIA = (nu / 720) * sinLat * cos5lat * (61 - 58 * tan2lat + tan4lat)
  const IV = nu * cosLat
  const V = (nu / 6) * cos3lat * (nu / rho - tan2lat)
  const VI =
    (nu / 120) *
    cos5lat *
    (5 - 18 * tan2lat + tan4lat + 14 * eta2 - 58 * tan2lat * eta2)

  const dLon = lon - lon0
  const dLon2 = dLon * dLon
  const dLon3 = dLon2 * dLon
  const dLon4 = dLon3 * dLon
  const dLon5 = dLon4 * dLon
  const dLon6 = dLon5 * dLon

  const N = I + II * dLon2 + III * dLon4 + IIIA * dLon6
  const E = E0 + IV * dLon + V * dLon3 + VI * dLon5

  return { easting: E, northing: N }
}

/**
 *
 * @param {*} value
 * @returns
 */
function toRad(value) {
  return (value * Math.PI) / 180
}

/**
 *
 * @param {*} value
 * @returns
 */
function toDeg(value) {
  return (value * 180) / Math.PI
}
