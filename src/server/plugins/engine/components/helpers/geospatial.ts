import {
  GeospatialFieldOptionsCountryEnum,
  type GeospatialFieldOptionsCountry
} from '@defra/forms-model'
import Bourne from '@hapi/bourne'
import { booleanWithin } from '@turf/boolean-within'
import JoiBase, { type CustomValidator } from 'joi'

import {
  type Coordinates,
  type Feature,
  type FeatureProperties,
  type Geometry
} from '~/src/server/plugins/engine/types.js'
import { countries } from '~/src/server/plugins/map/routes/index.js'

const countriesDesc: Record<GeospatialFieldOptionsCountryEnum, string> = {
  [GeospatialFieldOptionsCountryEnum.England]: 'England',
  [GeospatialFieldOptionsCountryEnum.NorthernIreland]: 'Northern Ireland',
  [GeospatialFieldOptionsCountryEnum.Scotland]: 'Scotland',
  [GeospatialFieldOptionsCountryEnum.Wales]: 'Wales'
}

const Joi = JoiBase.extend({
  type: 'array',
  base: JoiBase.array(),
  messages: {
    'object.invalidjson': '{{#label}} must be a valid json array string'
  },
  coerce: {
    from: 'string',
    method(value, helpers) {
      if (typeof value === 'string') {
        if (value.trim() === '') {
          return {
            value: undefined
          }
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          return { value: Bourne.parse(value) }
        } catch {
          const result = {
            value,
            errors: [helpers.error('object.invalidjson')]
          }

          return result
        }
      } else {
        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          value
        }
      }
    }
  }
}) as JoiBase.Root

const coordinatesSchema = Joi.array<Coordinates[]>()
  .items(Joi.number().required(), Joi.number().required())
  .required()

const featurePropertiesSchema = Joi.object<FeatureProperties>()
  .keys({
    description: Joi.string().required(),
    coordinateGridReference: Joi.string().required(),
    centroidGridReference: Joi.string().required()
  })
  .required()

const featureGeometrySchema = Joi.object<Geometry>().keys({
  type: Joi.string().valid('Point', 'LineString', 'Polygon').required(),
  coordinates: Joi.array()
    .when('type', {
      switch: [
        { is: 'Point', then: coordinatesSchema },
        {
          is: 'LineString',
          then: Joi.array().items(coordinatesSchema).min(2)
        },
        {
          is: 'Polygon',
          then: Joi.array().items(Joi.array().items(coordinatesSchema).min(3))
        }
      ]
    })
    .required()
})

const featureSchema = Joi.object<Feature>().keys({
  id: Joi.string().required(),
  type: Joi.string().valid('Feature').required(),
  properties: featurePropertiesSchema,
  geometry: featureGeometrySchema
})

const geospatialSchema = Joi.array<Feature[]>()
  .items(featureSchema)
  .unique('id')
  .required()

export function getGeospatialSchema(country?: GeospatialFieldOptionsCountry) {
  if (!country) {
    return geospatialSchema
  }

  const validateCountryBounds: CustomValidator = (value, helpers) => {
    const countryFeature = countries.features.find(
      (feature) => feature.id === country
    )

    if (!countryFeature) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value
    }

    const result = booleanWithin(value, countryFeature)

    if (!result) {
      return helpers.error('any.custom', {
        country: countriesDesc[country as GeospatialFieldOptionsCountryEnum]
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value
  }

  return Joi.array<Feature[]>()
    .items(featureSchema.custom(validateCountryBounds))
    .unique('id')
    .required()
}

/**
 * @import { CustomHelpers } from 'joi'
 */
