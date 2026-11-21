import { TelephoneNumberFieldOptionsFormatEnum } from '@defra/forms-model'
import LibPhoneNumber from 'google-libphonenumber'
import JoiBase from 'joi'

import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

const phoneUtil = LibPhoneNumber.PhoneNumberUtil.getInstance()

export const COUNTRY = 'GB'
export const INVALID_ERROR_CODE = 'phoneNumber.invalid'

/**
 * @param {LibPhoneNumber.PhoneNumber} value
 */
export const isUKNumber = (value) => {
  return phoneUtil.isValidNumberForRegion(value, COUNTRY)
}

export const joi = /** @type {JoiBase.Root} */ (
  JoiBase.extend({
    type: 'string',
    base: JoiBase.string(),
    messages: /** @type {LanguageMessages} */ ({
      [INVALID_ERROR_CODE]: messageTemplate.format
    }),
    rules: {
      phoneNumber: {
        /**
         * @param {{ format?: TelephoneNumberFieldOptionsFormatEnum }} [options]
         */
        method({ format } = {}) {
          return this.$_addRule({
            name: 'phoneNumber',
            args: { format }
          })
        },
        args: [
          {
            name: 'format',
            ref: true,
            assert: JoiBase.valid(
              TelephoneNumberFieldOptionsFormatEnum.International,
              TelephoneNumberFieldOptionsFormatEnum.UK
            )
          }
        ],
        /**
         * @param {string} value
         * @param {JoiBase.CustomHelpers} helpers
         * @param {{ format?: TelephoneNumberFieldOptionsFormatEnum }} args
         */
        validate(value, { error }, args) {
          const format = args.format

          try {
            const parsed = phoneUtil.parse(value, COUNTRY)

            if (!phoneUtil.isValidNumber(parsed)) {
              return error(INVALID_ERROR_CODE)
            }

            if (format) {
              const isUK = isUKNumber(parsed)

              if (
                (!isUK &&
                  format === TelephoneNumberFieldOptionsFormatEnum.UK) ||
                (isUK &&
                  format ===
                    TelephoneNumberFieldOptionsFormatEnum.International)
              ) {
                return error(INVALID_ERROR_CODE)
              }
            }

            return value
          } catch {
            return error(INVALID_ERROR_CODE)
          }
        }
      }
    }
  })
)

/**
 * @import { LanguageMessages } from 'joi'
 */
