import { type OsGridRefFieldComponent } from '@defra/forms-model'
import type joi from 'joi'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'

export class OsGridRefField extends LocationFieldBase {
  declare options: OsGridRefFieldComponent['options']

  protected getValidationConfig() {
    return {
      pattern: /^[A-Z]{2}\d{6,10}$/i,
      patternErrorMessage: `Enter a valid OS grid reference for ${this.title} like TQ123456`,
      customValidation: (value: string, helpers: joi.CustomHelpers) => {
        // Strip spaces and commas
        const cleanValue = value.replace(/[\s,]/g, '')

        // Check if it matches the pattern after cleaning
        if (!/^[A-Z]{2}\d{6,10}$/i.test(cleanValue)) {
          return helpers.error('string.pattern.base')
        }

        return cleanValue
      }
    }
  }

  protected getErrorTemplates() {
    return [
      {
        type: 'pattern',
        template:
          'Enter a valid OS grid reference for [short description] like TQ123456'
      }
    ]
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors() {
    const instance = Object.create(OsGridRefField.prototype) as OsGridRefField
    return instance.getAllPossibleErrors()
  }
}
