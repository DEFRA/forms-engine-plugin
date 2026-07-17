const style = {
  stroke: '#00897B',
  fillPattern: 'diagonal-cross-hatch',
  fillPatternForegroundColor: '#00897B',
  fillPatternBackgroundColor: 'transparent'
}
const minZoom = 12

const englandWFS =
  'https://environment.data.gov.uk/geoservices/datasets/ba8dc201-66ef-4983-9d46-7378af21027e/ogc/features/v1/collections/Sites_of_Special_Scientific_Interest_England/items?f=json'
const walesWFS =
  'https://datamap.gov.wales/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=inspire-nrw:NRW_SSSI&outputFormat=application/json&srsName=EPSG:4326'
const scotlandWFS =
  'https://services1.arcgis.com/LM9GyVFsughzHdbO/ArcGIS/rest/services/Sites_of_Special_Scientific_Interest/FeatureServer/0/query?f=geojson&where=1%3D1&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=true&outFields=*'

export default {
  datasets: [
    {
      id: 'sssi-england',
      label: 'Sites of Special Scientific Interest',
      dynamicGeoJSON: {
        url: englandWFS,
        idProperty: 'ref_code',
        /**
         * @type {TransformRequestArgs}
         */
        transformRequest: (url, { bbox }) => {
          const uri = new URL(url)
          uri.searchParams.set('bbox', bbox.join(','))

          return {
            url: uri.toString()
          }
        }
      },
      minZoom,
      style,
      showInKey: true,
      showInMenu: false
    },
    {
      id: 'sssi-wales',
      label: 'SSSI Wales',
      dynamicGeoJSON: {
        url: walesWFS,
        idProperty: 'id',
        /**
         * @type {TransformRequestArgs}
         */
        transformRequest: (url, { bbox }) => {
          const uri = new URL(url)
          uri.searchParams.set('bbox', `${bbox.join(',')},EPSG:4326`)

          return {
            url: uri.toString()
          }
        }
      },
      minZoom,
      style,
      showInKey: false,
      showInMenu: false
    },
    {
      id: 'sssi-scotland',
      label: 'SSSI Scotland',
      dynamicGeoJSON: {
        url: scotlandWFS,
        idProperty: 'OBJECTID',
        /**
         * @type {TransformRequestArgs}
         */
        transformRequest: (url, { bbox }) => {
          const uri = new URL(url)
          uri.searchParams.set('geometry', bbox.join(','))

          return {
            url: uri.toString()
          }
        }
      },
      minZoom,
      style,
      showInKey: false,
      showInMenu: false
    }
  ]
}

/**
 * @typedef {object} TransformRequestOptions
 * @property {string[]} bbox - the bounding box coordinates
 */

/**
 * Transforms the request URL with bounding box parameters
 * @callback TransformRequestArgs
 * @param {string} url - the request URL
 * @param {TransformRequestOptions} options - the bounding box coordinates
 */
