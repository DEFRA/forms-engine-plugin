import { type NationalGridFieldNumberFieldComponent } from '@defra/forms-model'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'

export class NationalGridFieldNumberField extends LocationFieldBase {
  declare options: NationalGridFieldNumberFieldComponent['options']

  protected getValidationConfig() {
    // Regex for OS grid references and parcel IDs
    // Validates specific valid OS grid letter combinations with:
    // - 2 letters & 8 digits in 2 blocks of 4 (parcel ID) e.g., ST 6789 6789
    // - 2 letters & 10 digits in 2 blocks of 5 (OS grid reference) e.g., SO 12345 12345
    const pattern =
      /^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\s?(([0-9]{4})\s?([0-9]{4})|([0-9]{5})\s?([0-9]{5}))$/

    return {
      pattern,
      patternErrorMessage: `Enter a valid National Grid field number for ${this.title} like NG 1234 5678`
    }
  }

  protected getErrorTemplates() {
    return [
      {
        type: 'pattern',
        template:
          'Enter a valid National Grid field number for [short description] like NG 1234 5678'
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
