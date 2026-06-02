import { TelephoneNumberFieldOptionsFormatEnum } from '@defra/forms-model'
import LibPhoneNumber from 'google-libphonenumber'
import JoiBase, { type JoiExpression, type LanguageMessages } from 'joi'

import { opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

const phoneUtil = LibPhoneNumber.PhoneNumberUtil.getInstance()

export const COUNTRY = 'GB'
export const INVALID_ERROR_CODE = 'phoneNumber.invalid'
export const UK_ERROR_CODE = 'phoneNumber.uk'
export const INTERNATIONAL_ERROR_CODE = 'phoneNumber.international'

export const isUKNumber = (value: LibPhoneNumber.PhoneNumber) => {
  return phoneUtil.isValidNumberForRegion(value, COUNTRY)
}

export function getErrorCode(format?: TelephoneNumberFieldOptionsFormatEnum) {
  if (format === TelephoneNumberFieldOptionsFormatEnum.UK) {
    return UK_ERROR_CODE
  } else if (format === TelephoneNumberFieldOptionsFormatEnum.International) {
    return INTERNATIONAL_ERROR_CODE
  }

  return INVALID_ERROR_CODE
}

export const joi = JoiBase.extend({
  type: 'string',
  base: JoiBase.string(),
  messages: {
    [INVALID_ERROR_CODE]: JoiBase.expression(
      'Enter {{lowerFirst(#label)}} in the correct format',
      opts
    ) as JoiExpression,
    [UK_ERROR_CODE]: JoiBase.expression(
      'Enter {{lowerFirst(#label)}}, like 01632 960 001, 07700 900 982 or +44 808 157 0192',
      opts
    ) as JoiExpression,
    [INTERNATIONAL_ERROR_CODE]: JoiBase.expression(
      'Enter {{lowerFirst(#label)}}, starting with + and the country code, for example +92333 1234567 or 00923331234567',
      opts
    ) as JoiExpression
  } as unknown as LanguageMessages,
  rules: {
    phoneNumber: {
      method({
        format
      }: { format?: TelephoneNumberFieldOptionsFormatEnum } = {}) {
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
      validate(value, { error }, args) {
        const format = args.format

        try {
          const parsed = phoneUtil.parse(value, COUNTRY)

          if (!phoneUtil.isValidNumber(parsed)) {
            return error(getErrorCode(format))
          }

          if (format) {
            const isUK = isUKNumber(parsed)

            if (!isUK && format === TelephoneNumberFieldOptionsFormatEnum.UK) {
              return error(UK_ERROR_CODE)
            } else if (
              isUK &&
              format === TelephoneNumberFieldOptionsFormatEnum.International
            ) {
              return error(INTERNATIONAL_ERROR_CODE)
            }
          }

          return value
        } catch {
          return error(getErrorCode(format))
        }
      }
    }
  }
}) as JoiBase.Root
