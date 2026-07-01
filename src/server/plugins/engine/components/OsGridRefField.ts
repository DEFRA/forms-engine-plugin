import { type OsGridRefFieldComponent } from '@defra/forms-model'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'
import { createLowerFirstExpression } from '~/src/server/plugins/engine/components/helpers/index.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'
import { type ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'

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

    return {
      pattern,
      patternErrorMessage: createLowerFirstExpression(
        t('components.osGridRefField.pattern', 'en-GB')
      ),
      requiredMessage: createLowerFirstExpression(
        t('components.osGridRefField.required', 'en-GB')
      )
    }
  }

  protected getErrorTemplates() {
    return [
      {
        type: 'pattern',
        template: createLowerFirstExpression(
          t('components.osGridRefField.pattern', 'en-GB')
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
            t('components.osGridRefField.required', 'en-GB')
          )
        },
        {
          type: 'pattern',
          template: createLowerFirstExpression(
            t('components.osGridRefField.pattern', 'en-GB')
          )
        }
      ],
      advancedSettingsErrors: []
    }
  }
}
