import {
  convertToDecAlpha,
  generateUniqueReference
} from '~/src/server/plugins/engine/referenceNumbers.js'

describe('generateUniqueReference', () => {
  it('should generate a reference number with 3 segments when no prefix is provided', () => {
    const referenceNumber = generateUniqueReference()
    const segments = referenceNumber.split('-')

    expect(segments).toHaveLength(3)

    segments.forEach((segment) => {
      expect(segment).toHaveLength(3)
    })
  })

  it('should generate a reference number with 2 segments when a prefix is provided', () => {
    const prefix = 'ABC'
    const referenceNumber = generateUniqueReference(prefix)
    const segments = referenceNumber.split('-')

    expect(segments).toHaveLength(3) // 1 for prefix and 2 for segments
    expect(segments[0]).toBe(prefix)

    segments.slice(1).forEach((segment) => {
      expect(segment).toHaveLength(3)
    })
  })

  it('should generate different reference numbers on subsequent calls', () => {
    const referenceNumber1 = generateUniqueReference()
    const referenceNumber2 = generateUniqueReference()
    expect(referenceNumber1).not.toBe(referenceNumber2)
  })

  describe('convertToDecAlpha', () => {
    it('should generate correct characters in string', () => {
      const allValuesHexPairs = Array.from(Array(256).keys())
      expect(convertToDecAlpha(allValuesHexPairs)).toBe(
        'AAAAAAAAA' +
          'BBBBBBBBB' +
          'CCCCCCCC' +
          'DDDDDDDDD' +
          'EEEEEEEE' +
          'FFFFFFFFF' +
          'HHHHHHHH' +
          'JJJJJJJJJ' +
          'KKKKKKKK' +
          'LLLLLLLLL' +
          'MMMMMMMM' +
          'NNNNNNNNN' +
          'PPPPPPPP' +
          'RRRRRRRRR' +
          'SSSSSSSS' +
          'TTTTTTTTT' +
          'UUUUUUUUU' +
          'VVVVVVVV' +
          'WWWWWWWWW' +
          'XXXXXXXX' +
          'YYYYYYYYY' +
          'ZZZZZZZZ' +
          '222222222' +
          '33333333' +
          '444444444' +
          '55555555' +
          '666666666' +
          '77777777' +
          '888888888' +
          '99999999'
      )
    })
  })
})
