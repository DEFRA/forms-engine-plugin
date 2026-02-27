import { type GeospatialState } from '~/src/server/plugins/engine/types.js'

export const validState: GeospatialState = [
  {
    type: 'Feature',
    properties: {
      description: 'My farm house'
    },
    geometry: {
      coordinates: [-2.5723699109417737, 53.2380485215034],
      type: 'Point'
    },
    id: 'a'
  },
  {
    type: 'Feature',
    properties: {
      description: 'Main gas line'
    },
    geometry: {
      coordinates: [
        [-2.570496516462896, 53.239162468888566],
        [-2.5722447488110447, 53.238174174285746]
      ],
      type: 'LineString'
    },
    id: 'b'
  },
  {
    type: 'Feature',
    properties: {
      description: 'My Pony Paddock'
    },
    geometry: {
      coordinates: [
        [
          [-2.573552894955583, 53.238229751360706],
          [-2.5738557065633643, 53.23812342993719],
          [-2.5737507318720247, 53.23797119653088],
          [-2.573411582871387, 53.23785037598134],
          [-2.5727575097991178, 53.23787454011864],
          [-2.572858447002119, 53.23825391528342],
          [-2.573552894955583, 53.238229751360706]
        ]
      ],
      type: 'Polygon'
    },
    id: 'c'
  },
  {
    type: 'Feature',
    properties: {
      description: 'My farm house #2'
    },
    geometry: {
      coordinates: [-2.5724, 53.239],
      type: 'Point'
    },
    id: 'd'
  }
]

export const validSingleState: GeospatialState = [
  {
    type: 'Feature',
    properties: {
      description: 'My farm house'
    },
    geometry: {
      coordinates: [-2.5723699109417737, 53.2380485215034],
      type: 'Point'
    },
    id: 'a'
  }
]
