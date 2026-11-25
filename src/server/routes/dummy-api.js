/**
 * @param {string} day
 * @param {string} month
 * @param {string} year
 */
function calculateAge(day, month, year) {
  const dobDate = new Date(Number(day), Number(month) - 1, Number(year))

  const today = new Date()

  let age = today.getFullYear() - dobDate.getFullYear()
  const m = today.getMonth() - dobDate.getMonth()

  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
    age--
  }

  return age
}

export default [
  {
    method: 'POST',
    path: '/api/example/on-load-page',
    /**
     * @param {Request<{ Payload: { meta: { referenceNumber: string } } }>} request
     * @param {ResponseToolkit} _h
     */
    handler(request, _h) {
      return {
        submissionEvent: 'GET',
        submissionReferenceNumber: request.payload.meta.referenceNumber
      }
    }
  },
  {
    method: 'POST',
    path: '/api/example/on-summary',
    /**
     * @param {Request<{
     *   Payload: {
     *     data: {
     *       main: {
     *         applicantFirstName: string
     *         applicantLastName: string
     *         dateOfBirth: string
     *       }
     *     }
     *     meta: { event: string; referenceNumber: string }
     *   }
     * }>} request
     * @param {ResponseToolkit} _h
     */
    handler(request, _h) {
      const [day, month, year] =
        request.payload.data.main.dateOfBirth.split('-')

      const age = calculateAge(day, month, year)

      return {
        calculatedAge: age,
        submissionEvent: 'POST',
        submissionReferenceNumber: request.payload.meta.referenceNumber // example of receiving a payload from DXT
      }
    }
  }
]

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
