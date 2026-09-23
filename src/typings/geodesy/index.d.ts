declare module 'geodesy/osgridref.js' {
  export class LatLon {
    constructor(lat: number, lon: number, height?: number)
    get latitude(): number
    get longitude(): number
    get height(): number
    toOsGrid(): OsGridRef
  }

  export default class OsGridRef {
    constructor(easting: number, northing: number)
    easting: number
    northing: number
    toLatLon(): LatLon
    toString(digits?: number): string
    static parse(gridref: string): OsGridRef
  }
}
