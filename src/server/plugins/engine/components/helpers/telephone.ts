import { TelephoneNumberFieldOptionsFormatEnum } from '@defra/forms-model'
import LibPhoneNumber from 'google-libphonenumber'
import JoiBase, { type LanguageMessages } from 'joi'

import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

const phoneUtil = LibPhoneNumber.PhoneNumberUtil.getInstance()

export const COUNTRY = 'GB'
export const INVALID_ERROR_CODE = 'phoneNumber.invalid'

export const isUKNumber = (value: LibPhoneNumber.PhoneNumber) => {
  return phoneUtil.isValidNumberForRegion(value, COUNTRY)
}

export const joi = JoiBase.extend({
  type: 'string',
  base: JoiBase.string(),
  messages: {
    [INVALID_ERROR_CODE]: messageTemplate.format
  } as LanguageMessages,
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
      validate(
        value: string,
        { error }: JoiBase.CustomHelpers,
        args: { format?: TelephoneNumberFieldOptionsFormatEnum }
      ) {
        const format = args.format

        try {
          const parsed = phoneUtil.parse(value, COUNTRY)

          if (!phoneUtil.isValidNumber(parsed)) {
            return error(INVALID_ERROR_CODE)
          }

          if (format) {
            const isUK = isUKNumber(parsed)

            if (
              (!isUK && format === TelephoneNumberFieldOptionsFormatEnum.UK) ||
              (isUK &&
                format === TelephoneNumberFieldOptionsFormatEnum.International)
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
}) as JoiBase.Root
