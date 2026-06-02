import { TelephoneNumberFieldOptionsFormatEnum } from '@defra/forms-model'

import { joi } from '~/src/server/plugins/engine/components/helpers/telephone.js'

describe('Telephone validation helpers', () => {
  describe('UK numbers', () => {
    test('it should not have errors for valid telephone number', () => {
      const telephoneSchema = joi
        .string()
        .phoneNumber({ format: TelephoneNumberFieldOptionsFormatEnum.UK })
        .label('Home phone')

      const result = telephoneSchema.validate('0160676477')

      expect(result.error).toBeUndefined()
      expect(result.value).toBe('0160676477')
    })

    test('it should not have errors for valid UK telephone number in international format', () => {
      const telephoneSchema = joi
        .string()
        .phoneNumber({ format: TelephoneNumberFieldOptionsFormatEnum.UK })
        .label('Home phone')

      const result = telephoneSchema.validate('+44 1606 76477')

      expect(result.error).toBeUndefined()
      expect(result.value).toBe('+44 1606 76477')
    })

    test('it should have errors for invalid telephone number', () => {
      const telephoneSchema = joi
        .string()
        .phoneNumber({ format: TelephoneNumberFieldOptionsFormatEnum.UK })
        .label('Home phone')

      const result = telephoneSchema.validate('ABC')

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe(
        'Enter home phone, like 01632 960 001, 07700 900 982 or +44 808 157 0192'
      )
      expect(result.value).toBe('ABC')
    })

    test('it should have errors for international telephone number', () => {
      const telephoneSchema = joi
        .string()
        .phoneNumber({ format: TelephoneNumberFieldOptionsFormatEnum.UK })
        .label('Home phone')

      const result = telephoneSchema.validate('+1-212-456-7890')

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe(
        'Enter home phone, like 01632 960 001, 07700 900 982 or +44 808 157 0192'
      )
      expect(result.value).toBe('+1-212-456-7890')
    })
  })

  describe('International numbers', () => {
    test('it should not have errors for valid telephone number', () => {
      const telephoneSchema = joi
        .string()
        .phoneNumber({
          format: TelephoneNumberFieldOptionsFormatEnum.International
        })
        .label('Home phone')

      const result = telephoneSchema.validate('+1-212-456-7890')

      expect(result.error).toBeUndefined()
      expect(result.value).toBe('+1-212-456-7890')
    })

    test('it should have errors for invalid telephone number', () => {
      const telephoneSchema = joi
        .string()
        .phoneNumber({
          format: TelephoneNumberFieldOptionsFormatEnum.International
        })
        .label('Home phone')

      const result = telephoneSchema.validate('ABC')

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe(
        'Enter home phone, starting with + and the country code, for example +92333 1234567 or 00923331234567'
      )
      expect(result.value).toBe('ABC')
    })

    test('it should have errors for UK phone number in international format', () => {
      const telephoneSchema = joi
        .string()
        .phoneNumber({
          format: TelephoneNumberFieldOptionsFormatEnum.International
        })
        .label('Home phone')

      const result = telephoneSchema.validate('+44 1606 76477')

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe(
        'Enter home phone, starting with + and the country code, for example +92333 1234567 or 00923331234567'
      )
      expect(result.value).toBe('+44 1606 76477')
    })
  })

  describe('Any format', () => {
    test('it should not have errors for valid national telephone number', () => {
      const telephoneSchema = joi.string().phoneNumber().label('Home phone')

      const result = telephoneSchema.validate('0160676477')

      expect(result.error).toBeUndefined()
      expect(result.value).toBe('0160676477')
    })

    test('it should not have errors for valid international telephone number', () => {
      const telephoneSchema = joi.string().phoneNumber().label('Home phone')

      const result = telephoneSchema.validate('+1-212-456-7890')

      expect(result.error).toBeUndefined()
      expect(result.value).toBe('+1-212-456-7890')
    })

    test('it should have errors for invalid telephone number', () => {
      const telephoneSchema = joi.string().phoneNumber().label('Home phone')

      const result = telephoneSchema.validate('ABC')

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe(
        'Enter home phone in the correct format'
      )
      expect(result.value).toBe('ABC')
    })
  })
})
