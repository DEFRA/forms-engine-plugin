import { getAnswer } from '~/src/server/plugins/engine/components/helpers.js'
import { answer } from '~/src/server/plugins/nunjucks/filters/answer.js'

jest.mock('~/src/server/plugins/engine/components/helpers.ts', () => ({
  getAnswer: jest.fn()
}))

describe('answer Nunjucks filter', () => {
  /** @type { NunjucksContext } */
  let mockThis

  beforeEach(() => {
    jest.clearAllMocks()

    mockThis = /** @type {NunjucksContext} */ (
      /** @type {unknown} */ ({
        ctx: {
          context: {
            componentMap: new Map(),
            relevantState: { someState: 'value' }
          }
        }
      })
    )

    jest.mocked(getAnswer).mockReturnValue('test answer')
  })

  describe('missing context', () => {
    it('returns undefined', () => {
      mockThis.ctx.context = undefined

      const result = answer.call(mockThis, 'componentName')

      expect(result).toBeUndefined()
      expect(getAnswer).not.toHaveBeenCalled()
    })
  })

  describe('component lookup', () => {
    it('returns undefined for non-existent component', () => {
      const result = answer.call(mockThis, 'nonExistentComponent')

      expect(result).toBeUndefined()
      expect(getAnswer).not.toHaveBeenCalled()
    })
  })

  describe('non-form component', () => {
    it('returns undefined', () => {
      mockThis.ctx.context?.componentMap.set(
        'nonFormComponent',
        // @ts-expect-error - simplified mock component for testing
        { isFormComponent: false }
      )

      const result = answer.call(mockThis, 'nonFormComponent')

      expect(result).toBeUndefined()
      expect(getAnswer).not.toHaveBeenCalled()
    })
  })

  describe('valid form component', () => {
    it('returns the answer', () => {
      const mockFormComponent = {
        isFormComponent: true,
        someProperty: 'value'
      }
      mockThis.ctx.context?.componentMap.set(
        'validFormComponent',
        // @ts-expect-error - simplified mock component for testing
        mockFormComponent
      )

      const result = answer.call(mockThis, 'validFormComponent')

      expect(getAnswer).toHaveBeenCalledWith(
        mockFormComponent,
        mockThis.ctx.context?.relevantState
      )
      expect(result).toBe('test answer')
    })
  })
})

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
