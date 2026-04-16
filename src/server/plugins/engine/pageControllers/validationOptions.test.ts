import {
  messageTemplate,
  messages,
  validationOptions
} from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('validationOptions', () => {
  it('messageTemplate.required is a JoiExpression object', () => {
    expect(typeof messageTemplate.required).toBe('object')
  })

  it('messageTemplate.max is a plain string', () => {
    expect(messageTemplate.max).toBe(
      '{{#label}} must be {{#limit}} characters or less'
    )
  })

  it('messages maps string.base to messageTemplate.required', () => {
    expect(messages['string.base']).toBe(messageTemplate.required)
  })

  it('validationOptions has abortEarly: false', () => {
    expect(validationOptions.abortEarly).toBe(false)
  })
})
