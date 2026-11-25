import Bourne from '@hapi/bourne'
import { booleanWithin } from '@turf/boolean-within'
import { point } from '@turf/helpers'
import OsGridRef from 'geodesy/osgridref.js'
import JoiBase from 'joi'

import { countriesValidate } from '~/src/server/plugins/map/routes/index.js'
import { CountryMap } from '~/src/server/plugins/map/types.js'

const Joi = /** @type {JoiBase.Root} */ (
  JoiBase.extend({
    type: 'array',
    base: JoiBase.array(),
    messages: {
      'object.invalidjson': '{{#label}} must be a valid json array string'
    },
    coerce: {
      from: 'string',
      method(value, helpers) {
        if (typeof value === 'string') {
          const trimmed = value.trim()
          if (trimmed === '' || trimmed === '[]') {
            return {
              value: undefined
            }
          }

          try {
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
  })
)

const coordinatesSchema = /** @type {JoiBase.ArraySchema<Coordinates[]>} */ (
  Joi.array()
)
  .items(Joi.number().required(), Joi.number().required())
  .required()

const featurePropertiesSchema =
  /** @type {JoiBase.ObjectSchema<FeatureProperties>} */ (Joi.object())
    .keys({
      description: Joi.string().required(),
      coordinateGridReference: Joi.string().required(),
      centroidGridReference: Joi.string().required()
    })
    .required()

const featureGeometrySchema = /** @type {JoiBase.ObjectSchema<Geometry>} */ (
  Joi.object()
).keys({
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

const featureSchema = /** @type {JoiBase.ObjectSchema<Feature>} */ (
  Joi.object()
).keys({
  id: Joi.string().required(),
  type: Joi.string().valid('Feature').required(),
  properties: featurePropertiesSchema,
  geometry: featureGeometrySchema
})

/**
 * @param {GeospatialFieldComponent} def
 * @param {boolean} isOptional
 */
export function determineLimits(def, isOptional) {
  const { schema: constraints } = def
  /** @type {{ min?: number, max?: number, length?: number }} */
  const limits = {}
  if (typeof constraints?.length === 'number') {
    limits.length = constraints.length
  } else {
    if (typeof constraints?.min === 'number') {
      limits.min = constraints.min
    } else if (!isOptional) {
      limits.min = 1
    }

    limits.max = typeof constraints?.max === 'number' ? constraints.max : 50
  }
  return limits
}

/**
 * @param {JoiBase.ArraySchema<Feature[]>} schema
 * @param {GeospatialFieldComponent} def
 */
function applySchemaConstraints(schema, def) {
  const { options } = def
  const isOptional = options.required === false

  const limits = determineLimits(def, isOptional)

  if (limits.length !== undefined) {
    schema = schema.length(limits.length)
  }
  if (limits.min !== undefined) {
    schema = schema.min(limits.min)
  }
  if (limits.max !== undefined) {
    schema = schema.max(limits.max)
  }

  if (isOptional) {
    schema = schema.optional()
  } else {
    schema = schema.required()
  }

  return schema
}

/**
 * @param {GeospatialFieldComponent} def
 * @returns {JoiBase.ArraySchema<Feature[]>}
 */
export function getGeospatialSchema(def) {
  const { options = {} } = def
  /** @type {GeospatialFieldOptionsCountry | undefined} */
  const country = options.countries?.at(0)

  if (!country) {
    return applySchemaConstraints(
      /** @type {JoiBase.ArraySchema<Feature[]>} */ (Joi.array())
        .items(featureSchema)
        .unique('id'),
      def
    )
  }

  /** @type {CustomValidator} */
  const validateCountryBounds = (value, helpers) => {
    const countryFeature = countriesValidate.features.find(
      (feature) => feature.id === CountryMap[country]
    )

    if (!countryFeature) {
      return value
    }

    const result = booleanWithin(
      /** @type {Geometry | Feature} */ (value),
      countryFeature
    )

    if (!result) {
      return helpers.error('any.custom', {
        country
      })
    }

    return value
  }

  return applySchemaConstraints(
    /** @type {JoiBase.ArraySchema<Feature[]>} */ (Joi.array())
      .items(featureSchema.custom(validateCountryBounds))
      .unique('id'),
    def
  )
}

/**
 * @param {EastingNorthingField} field
 * @param {GeospatialFieldOptionsCountry} country
 */
export function getEastingNorthingCountryValidator(field, country) {
  /** @type {CustomValidator} */
  const validateCountryBounds = (value, helpers) => {
    const countryFeature = countriesValidate.features.find(
      (feature) => feature.id === CountryMap[country]
    )

    if (!countryFeature) {
      return value
    }

    const eastingNorthing = field.getFormValueFromState(
      /** @type {EastingNorthingState} */ (value)
    )

    if (!eastingNorthing) {
      return value
    }

    const gridRef = new OsGridRef(
      eastingNorthing.easting,
      eastingNorthing.northing
    )
    const latLong = gridRef.toLatLon()
    const coord = point([latLong.longitude, latLong.latitude])
    const within = booleanWithin(coord, countryFeature)

    if (!within) {
      return helpers.error(
        'any.custom',
        {
          country
        },
        { path: [field.name] }
      )
    }

    return value
  }

  return validateCountryBounds
}

/**
 * @import { GeospatialFieldComponent, GeospatialFieldOptionsCountry } from '@defra/forms-model'
 * @import { CustomValidator } from 'joi'
 * @import { EastingNorthingField } from '~/src/server/plugins/engine/components/EastingNorthingField.js'
 * @import { EastingNorthingState } from '~/src/server/plugins/engine/components/types.js'
 * @import { Coordinates, Feature, FeatureProperties, Geometry } from '~/src/server/plugins/engine/types.js'
 */
