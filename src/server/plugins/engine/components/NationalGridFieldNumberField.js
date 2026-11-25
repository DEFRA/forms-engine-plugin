import { EN_GB } from '~/src/server/constants.js'
import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'
import { createLowerFirstExpression } from '~/src/server/plugins/engine/components/helpers/index.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'

export class NationalGridFieldNumberField extends LocationFieldBase {
  /** @type {NationalGridFieldNumberFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /**
   * @protected
   * @param {Translator | undefined} translator
   */
  getValidationConfig(translator) {
    // Regex for OS national grid field references (NGFR)
    // Validates specific valid OS grid letter combinations with:
    // - 2 letters & 8 digits in 2 blocks of 4 e.g. ST 6789 6789
    const pattern =
      /^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\s?([0-9]{4})\s?([0-9]{4})$/

    return {
      pattern,
      patternErrorMessage: createLowerFirstExpression(
        translator
          ? translator.t('components.nationalGridField.pattern')
          : t('components.nationalGridField.pattern', EN_GB)
      ),
      requiredMessage: createLowerFirstExpression(
        translator
          ? translator.t('components.nationalGridField.required')
          : t('components.nationalGridField.required', EN_GB)
      )
    }
  }

  /**
   * @protected
   */
  getErrorTemplates() {
    return [
      {
        type: 'pattern',
        template: createLowerFirstExpression(
          t('components.nationalGridField.pattern', 'en-GB')
        )
      }
    ]
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
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

/**
 * @import { NationalGridFieldNumberFieldComponent } from '@defra/forms-model'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'
 */
