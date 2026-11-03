/**
 * Recursively removes `enum` keywords that contain a Joi reference such as
 * `{ ref: { path: ['conditions'] } }`. A Joi reference means the allowed values
 * come from elsewhere in the form definition, so the enum has no fixed list to
 * document. The doc generator renders enum values as a table, which needs
 * primitive or array values.
 * @param {JsonSchema} schema - The schema to clean in place
 */
export function removeJoiReferenceEnums(schema) {
  if (!schema || typeof schema !== 'object') {
    return
  }

  if (
    Array.isArray(schema.enum) &&
    schema.enum.some(
      (value) =>
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'ref' in value
    )
  ) {
    delete schema.enum
  }

  for (const child of Object.values(schema)) {
    removeJoiReferenceEnums(child)
  }
}

/**
 * @import { JsonSchema } from './generate-schema-docs.js'
 */
