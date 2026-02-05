import { type OsGridRefFieldComponent } from '@defra/forms-model'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'
import { createLowerFirstExpression } from '~/src/server/plugins/engine/components/helpers/index.js'

export class OsGridRefField extends LocationFieldBase {
  declare options: OsGridRefFieldComponent['options']

  protected getValidationConfig() {
    // Regex for OS national grid references (NGR)
    // Validates specific valid OS grid letter combinations with:
    // - 2 letters & 6 digits in 2 blocks of 3 e.g. ST 678 678
    // - 2 letters & 8 digits in 2 blocks of 4 e.g. ST 6789 6789
    // - 2 letters & 10 digits in 2 blocks of 5 e.g. SO 12345 12345
    // Optional spaces between each block
    const pattern =
      /^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\s?(([0-9]{3})\s?([0-9]{3})|([0-9]{4})\s?([0-9]{4})|([0-9]{5})\s?([0-9]{5}))$/

    const patternTemplate = this.options.preserveLabelCasing
      ? 'Enter a valid OS grid reference for {{#title}} like TQ123456'
      : 'Enter a valid OS grid reference for {{lowerFirst(#title)}} like TQ123456'

    return {
      pattern,
      patternErrorMessage: createLowerFirstExpression(patternTemplate),
      requiredMessage: createLowerFirstExpression(
        this.options.preserveLabelCasing
          ? 'Enter {{#title}}'
          : 'Enter {{lowerFirst(#title)}}'
      )
    }
  }

  protected getErrorTemplates() {
    return [
      {
        type: 'pattern',
        template: createLowerFirstExpression(
          'Enter a valid OS grid reference for {{lowerFirst(#title)}} like TQ123456'
        )
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
