import { type OsGridRefFieldComponent } from '@defra/forms-model'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'

export class OsGridRefField extends LocationFieldBase {
  declare options: OsGridRefFieldComponent['options']

  protected getValidationConfig() {
    // Regex for OS grid references and parcel IDs
    // Validates specific valid OS grid letter combinations with:
    // - 2 letters & 6 digits (e.g., SD865005 or SD 865 005)
    const pattern =
      /^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\s?(([0-9]{3})\s?([0-9]{3}))$/

    return {
      pattern,
      patternErrorMessage: `Enter a valid OS grid reference for ${this.title} like TQ123456`
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
