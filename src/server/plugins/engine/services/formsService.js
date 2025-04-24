const error = Error(
  'Not implemented. Consider setting up a form loader or providing a service implementation.'
)

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * Dummy function to get form metadata.
 * @param {string} _slug - the slug of the form
 * @returns {Promise<FormMetadata>}
 */
export function getFormMetadata(_slug) {
  throw error
}

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * Dummy function to get form metadata.
 * @param {string} _id - the id of the form
 * @param {FormStatus} _state - the state of the form
 * @returns {Promise<FormDefinition | undefined>}
 */
export function getFormDefinition(_id, _state) {
  throw error
}

/**
 * @import { FormStatus, FormDefinition, FormMetadata } from '@defra/forms-model'
 */
