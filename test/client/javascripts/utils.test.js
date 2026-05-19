import { formatDelimtedList } from '~/src/client/javascripts/utils.js'

describe('utils', () => {
  describe('formatDelimitedList', () => {
    it('should handle empty list', () => {
      expect(formatDelimtedList([], ',', 'or')).toBe('')
    })

    it('should handle one item', () => {
      expect(formatDelimtedList(['item1'], ',', 'or')).toBe('item1')
    })

    it('should handle two items', () => {
      expect(formatDelimtedList(['item1', 'item2'], ',', 'or')).toBe(
        'item1 or item2'
      )
    })

    it('should handle three items', () => {
      expect(formatDelimtedList(['item1', 'item2', 'item3'], ',', 'or')).toBe(
        'item1, item2 or item3'
      )
    })
  })
})
