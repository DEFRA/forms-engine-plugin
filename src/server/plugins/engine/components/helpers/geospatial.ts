import {
  GeospatialFieldOptionsCountryEnum,
  type GeospatialFieldComponent,
  type GeospatialFieldOptionsCountry
} from '@defra/forms-model'
import Bourne from '@hapi/bourne'
import { booleanWithin } from '@turf/boolean-within'
import { point } from '@turf/helpers'
// @ts-expect-error - no types
import OsGridRef from 'geodesy/osgridref.js'
import JoiBase, { type CustomValidator } from 'joi'

import { type EastingNorthingField } from '~/src/server/plugins/engine/components/EastingNorthingField.js'
import { type EastingNorthingState } from '~/src/server/plugins/engine/components/types.js'
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
        const trimmed = value.trim()
        if (trimmed === '' || trimmed === '[]') {
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

export function determineLimits(
  def: GeospatialFieldComponent,
  isOptional: boolean
) {
  const { schema: constraints } = def
  const limits: { min?: number; max?: number; length?: number } = {}
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

function applySchemaConstraints(
  schema: JoiBase.ArraySchema<Feature[]>,
  def: GeospatialFieldComponent
) {
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

export function getGeospatialSchema(
  def: GeospatialFieldComponent
): JoiBase.ArraySchema<Feature[]> {
  const { options = {} } = def
  const country: GeospatialFieldOptionsCountry | undefined =
    options.countries?.at(0)

  if (!country) {
    return applySchemaConstraints(
      Joi.array<Feature[]>().items(featureSchema).unique('id'),
      def
    )
  }

  const validateCountryBounds: CustomValidator = (value, helpers) => {
    const countryFeature = countries.features.find(
      (feature) => feature.id === country
    )

    if (!countryFeature) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value
    }

    const result = booleanWithin(value as Geometry | Feature, countryFeature)

    if (!result) {
      return helpers.error('any.custom', {
        country: countriesDesc[country as GeospatialFieldOptionsCountryEnum]
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value
  }

  return applySchemaConstraints(
    Joi.array<Feature[]>()
      .items(featureSchema.custom(validateCountryBounds))
      .unique('id'),
    def
  )
}

export function getEastingNorthingCountryValidator(
  field: EastingNorthingField,
  country: GeospatialFieldOptionsCountry
) {
  const validateCountryBounds: CustomValidator = (value, helpers) => {
    const countryFeature = countries.features.find(
      (feature) => feature.id === country
    )

    if (!countryFeature) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value
    }

    const eastingNorthing = field.getFormValueFromState(
      value as EastingNorthingState
    )

    if (!eastingNorthing) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
          country: countriesDesc[country as GeospatialFieldOptionsCountryEnum]
        },
        { path: [field.name] }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value
  }

  return validateCountryBounds
}
