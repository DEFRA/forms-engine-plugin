import { type NationalGridFieldNumberFieldComponent } from '@defra/forms-model'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'
import { createLowerFirstExpression } from '~/src/server/plugins/engine/components/helpers/index.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'
import { type ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'

export class NationalGridFieldNumberField extends LocationFieldBase {
  declare options: NationalGridFieldNumberFieldComponent['options']

  protected getValidationConfig() {
    // Regex for OS national grid field references (NGFR)
    // Validates specific valid OS grid letter combinations with:
    // - 2 letters & 8 digits in 2 blocks of 4 e.g. ST 6789 6789
    const pattern =
      /^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\s?([0-9]{4})\s?([0-9]{4})$/

    return {
      pattern,
      patternErrorMessage: createLowerFirstExpression(
        this.model.t('components.nationalGridField.pattern')
      ),
      requiredMessage: createLowerFirstExpression(
        this.model.t('components.nationalGridField.required')
      )
    }
  }

  protected getErrorTemplates() {
    return [
      {
        type: 'pattern',
        template: createLowerFirstExpression(
          this.model.t('components.nationalGridField.pattern')
        )
      }
    ]
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        {
          type: 'required',
          template: createLowerFirstExpression(
            t('components.nationalGridField.required', 'en-GB')
          )
        },
        {
          type: 'pattern',
          template: createLowerFirstExpression(
            t('components.nationalGridField.pattern', 'en-GB')
          )
        }
      ],
      advancedSettingsErrors: []
    }
  }
}
