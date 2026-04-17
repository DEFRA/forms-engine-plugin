import { type NationalGridFieldNumberFieldComponent } from '@defra/forms-model'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'
import { createLowerFirstExpression } from '~/src/server/plugins/engine/components/helpers/index.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'

export class NationalGridFieldNumberField extends LocationFieldBase {
  declare options: NationalGridFieldNumberFieldComponent['options']

  protected getValidationConfig(lang = 'en-GB') {
    // Regex for OS national grid field references (NGFR)
    // Validates specific valid OS grid letter combinations with:
    // - 2 letters & 8 digits in 2 blocks of 4 e.g. ST 6789 6789
    const pattern =
      /^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\s?([0-9]{4})\s?([0-9]{4})$/

    return {
      pattern,
      patternErrorMessage: createLowerFirstExpression(
        t('components.nationalGridField.pattern', lang)
      ),
      requiredMessage: createLowerFirstExpression(
        t('components.nationalGridField.required', lang)
      )
    }
  }

  protected getErrorTemplates(lang = 'en-GB') {
    return [
      {
        type: 'pattern',
        template: createLowerFirstExpression(
          t('components.nationalGridField.pattern', lang)
        )
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
