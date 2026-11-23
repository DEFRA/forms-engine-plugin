import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { DEFAULT_REFERENCE_NUMBER } from '~/src/server/plugins/engine/referenceNumbers.js'
import { type FormRequestPayload } from '~/src/server/plugins/engine/types/index.js'

describe('FormComponent', () => {
  describe('getReference', () => {
    it.each([
      [{ $$__referenceNumber: 'ref-123' }, {}, 'ref-123'],
      [{ $$__referenceNumber: 'ref-123' }, { force: '' }, 'ref-123'],
      [{ $$__referenceNumber: '' }, { force: '' }, ''],
      [{}, { force: '' }, DEFAULT_REFERENCE_NUMBER],
      [{}, {}, undefined]
    ])(
      'returns the expected reference for state %o and query %o',
      (state, query, expected) => {
        const request = { query } as FormRequestPayload

        expect(FormComponent.getReference(state, request)).toBe(expected)
      }
    )
  })
})
