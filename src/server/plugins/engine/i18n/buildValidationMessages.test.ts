import joi from 'joi'

import { buildValidationMessages } from '~/src/server/plugins/engine/i18n/buildValidationMessages.js'
import { t } from '~/src/server/plugins/engine/i18n/index.js'

describe('buildValidationMessages', () => {
  const tEnGB = (key: string) => t(key, 'en-GB')
  const messages = buildValidationMessages(tEnGB)

  it('required is a JoiExpression resolving to the correct template', () => {
    const schema = joi
      .string()
      .label('Full name')
      .messages({
        'string.empty': messages.required as unknown as string
      })
    const { error } = schema.validate('')
    expect(error?.details[0].message).toBe('Enter full name')
  })

  it('max is a plain string template', () => {
    expect(messages.max).toBe(
      '{{#label}} must be {{#limit}} characters or less'
    )
  })

  it('dateFormat is a plain string template', () => {
    expect(messages.dateFormat).toBe('{{#title}} must be a real date')
  })

  it('declarationRequired is a JoiExpression', () => {
    expect(typeof messages.declarationRequired).toBe('object')
  })

  it('produces the same keys as the original messageTemplate', () => {
    const expectedKeys = [
      'required',
      'selectRequired',
      'selectYesNoRequired',
      'pattern',
      'format',
      'declarationRequired',
      'objectRequired',
      'objectMissing',
      'max',
      'min',
      'minMax',
      'number',
      'numberPrecision',
      'numberInteger',
      'numberMin',
      'numberMax',
      'maxWords',
      'dateFormat',
      'dateMin',
      'dateMax'
    ]
    expect(Object.keys(messages)).toEqual(expect.arrayContaining(expectedKeys))
  })
})
