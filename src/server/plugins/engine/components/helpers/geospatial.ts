import Bourne from '@hapi/bourne'
import JoiBase from 'joi'

import {
  type Coordinates,
  type Feature,
  type FeatureProperties,
  type Geometry
} from '~/src/server/plugins/engine/types.js'

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
            value: []
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
    description: Joi.string().required()
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

export const geospatialSchema = Joi.array<Feature[]>()
  .items(featureSchema)
  .unique('id')
  .required()

/**
 * @import { CustomHelpers } from 'joi'
 */
