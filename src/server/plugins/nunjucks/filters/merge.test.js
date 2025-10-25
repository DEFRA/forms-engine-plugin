import { merge } from '~/src/server/plugins/nunjucks/filters/merge.js'

describe('merge', () => {
  const propertyToMerge = { lorem: 'ipsum' }
  it('should return the target if target is not an object', () => {
    expect(merge('string', propertyToMerge)).toBe('string')
  })
  it('should return the target if source is not an object', () => {
    expect(merge(propertyToMerge, 'dolar')).toBe(propertyToMerge)
  })

  it('should merge the properties if they are valid', () => {
    expect(merge({ lorem: 'dolar', dolar: 'sit' }, propertyToMerge)).toEqual({
      lorem: 'ipsum',
      dolar: 'sit'
    })
  })
})
