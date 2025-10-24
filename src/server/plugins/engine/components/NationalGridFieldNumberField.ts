import { type NationalGridFieldNumberFieldComponent } from '@defra/forms-model'
import type joi from 'joi'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'

export class NationalGridFieldNumberField extends LocationFieldBase {
  declare options: NationalGridFieldNumberFieldComponent['options']

  protected getValidationConfig() {
    return {
      pattern: /^[A-Z]{2}\d{8}$/i,
      patternErrorMessage: `Enter a valid National Grid field number for ${this.title} like NG12345678`,
      customValidation: (value: string, helpers: joi.CustomHelpers) => {
        // Strip spaces and commas
        const cleanValue = value.replace(/[\s,]/g, '')

        // Check if it matches the pattern after cleaning
        if (!/^[A-Z]{2}\d{8}$/i.test(cleanValue)) {
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
          'Enter a valid National Grid field number for [short description] like NG12345678'
      }
    ]
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors() {
    const instance = Object.create(
      NationalGridFieldNumberField.prototype
    ) as NationalGridFieldNumberField
    return instance.getAllPossibleErrors()
  }
}
