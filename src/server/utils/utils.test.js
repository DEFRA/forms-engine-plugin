import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'
import { applyTraceHeaders, isValidUUID } from '~/src/server/utils/utils.js'

jest.mock('@defra/hapi-tracing')

describe('Header helper functions', () => {
  it('should include the trace id in the headers if available', () => {
    jest.mocked(getTraceId).mockReturnValue('my-trace-id')

    const result = applyTraceHeaders() // Updated to applyTraceHeaders
    expect(result).toEqual({
      [config.get('tracing').header]: 'my-trace-id'
    })
  })

  it('should exclude the trace id in the headers if missing', () => {
    jest.mocked(getTraceId).mockReturnValue(null)

    const result = applyTraceHeaders() // Updated to applyTraceHeaders
    expect(result).toBeUndefined()
  })

  it('should merge existing headers with the trace id if available', () => {
    jest.mocked(getTraceId).mockReturnValue('my-trace-id')

    const existingHeaders = { Authorization: 'Bearer token' }
    const result = applyTraceHeaders(existingHeaders) // Updated to applyTraceHeaders

    expect(result).toEqual({
      Authorization: 'Bearer token',
      [config.get('tracing').header]: 'my-trace-id'
    })
  })

  it('should return existing headers without modification if trace id is missing', () => {
    jest.mocked(getTraceId).mockReturnValue(null)

    const existingHeaders = { Authorization: 'Bearer token' }
    const result = applyTraceHeaders(existingHeaders) // Updated to applyTraceHeaders

    expect(result).toEqual({
      Authorization: 'Bearer token'
    })
  })

  it('should return existing headers if tracing header configuration is missing', () => {
    const existingHeaders = { Authorization: 'Bearer token' }
    const result = applyTraceHeaders(existingHeaders, '')

    expect(result).toBe(existingHeaders)
  })

  it.each([
    { uuid: '1f457a37-7b99-452e-8324-df9e041abff2', valid: true },
    { uuid: '0c9a2690-9a0c-4a2c-98d7-e9ef95615ac9', valid: true },
    { uuid: 'f223de3b-5ae5-44b2-8cee-ea8439adc335', valid: true },
    { uuid: '82ecc90c-bc47-4ec5-80af-1a9fc1c4c08c', valid: true },
    { uuid: 'd99ff582-ecce-474f-a44b-bc5961d977c5', valid: true },
    { uuid: '7afffc8a-81ab-4aa6-a8f5-ecf6a600a781', valid: true },
    { uuid: '7afffc8a81ab4aa6a8f5ecf6a600a781', valid: true },
    { uuid: '', valid: false },
    { uuid: 'uuid', valid: false },
    { uuid: 'h4f84ef8-b5e1-4544-94aa-1b671d50d8cb', valid: false }
  ])('should validate uuid appropriately %s', ({ uuid, valid }) => {
    expect(isValidUUID(uuid)).toBe(valid)
  })
})
