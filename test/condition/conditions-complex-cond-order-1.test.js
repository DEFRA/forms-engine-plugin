import { resolve } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/conditions-complex-cond-order-1`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Form journey', () => {
  const journey = [
    /**
     * Question page 1
     */
    {
      heading1:
        'Installations and medium combustion plant and specified generator permits: ask for pre-application advice',

      paths: {
        current:
          '/installations-and-medium-combustion-plant-and-specified-generator-permits-ask-for-pre-application-advice',
        next: '/what-is-the-main-activity-you-want-advice-for'
      },

      fields: [
        {
          title: 'Will or does your activity take place in England?',
          payload: {
            empty: { NKpEWI: '' },
            valid: { NKpEWI: 'true' }
          },

          errors: {
            empty: 'Select activity in England?'
          }
        }
      ]
    },

    /**
     * Question page 2
     */
    {
      heading1: 'What is the main activity you want advice for?',

      paths: {
        previous:
          '/installations-and-medium-combustion-plant-and-specified-generator-permits-ask-for-pre-application-advice',
        current: '/what-is-the-main-activity-you-want-advice-for',
        next: '/is-your-pre-application-request-related-to-a-priority-tracked-application'
      },

      fields: [
        {
          title: 'What is the main activity you want advice for?',
          payload: {
            empty: { DXJWgF: '' },
            valid: {
              DXJWgF:
                'Using, treating, storing or disposing of waste or mining waste, an industrial process, intensive farms, manufacturing or any other business that produce potentially harmful substances.'
            }
          },

          errors: {
            empty: 'Select main activity'
          }
        }
      ]
    },

    /**
     * Question page 3
     */
    {
      heading1:
        'Is your pre-application request related to a priority tracked application?',

      paths: {
        previous: '/what-is-the-main-activity-you-want-advice-for',
        current:
          '/is-your-pre-application-request-related-to-a-priority-tracked-application',
        next: '/do-you-want-to-know-more-about-permit-applications-for-the-following-types-of-activities-known-as-a1-installations-or-are-you-carrying-out-a-medium-combustion-or-specified-generator-activity'
      },

      fields: [
        {
          title:
            'Is your pre-application request related to a priority tracked application?',
          payload: {
            empty: { dxNvxj: '' },
            valid: { dxNvxj: 'false' }
          },

          errors: {
            empty: 'Select tracked?'
          }
        }
      ]
    },

    /**
     * Question page 4
     */
    {
      heading1:
        "Do you want to know more about permit applications for the following types of activities, known as 'A1 installations' or are you carrying out a medium combustion or specified generator activity?",

      paths: {
        previous:
          '/is-your-pre-application-request-related-to-a-priority-tracked-application',
        current:
          '/do-you-want-to-know-more-about-permit-applications-for-the-following-types-of-activities-known-as-a1-installations-or-are-you-carrying-out-a-medium-combustion-or-specified-generator-activity',
        next: '/what-is-or-will-be-your-main-a1-installations-activity-that-you-need-pre-application-advice-about'
      },

      fields: [
        {
          title:
            "Do you want to know more about permit applications for the following types of activities, known as 'A1 installations' or are you carrying out a medium combustion or specified generator activity?",
          payload: {
            empty: { mOPwGp: '' },
            valid: {
              mOPwGp:
                'Energy: combustion with on site aggregated rated thermal input of 50 megawatts or more, gasification, liquefaction and refining activities (not including medium combustion plant and specified generators - select specific option below instead).'
            }
          },

          errors: {
            empty: 'Select installation type'
          }
        }
      ]
    },

    /**
     * Question page 5
     */
    {
      heading1:
        'What is or will be your main A1 installations activity that you need pre-application advice about?',

      paths: {
        previous:
          '/do-you-want-to-know-more-about-permit-applications-for-the-following-types-of-activities-known-as-a1-installations-or-are-you-carrying-out-a-medium-combustion-or-specified-generator-activity',
        current:
          '/what-is-or-will-be-your-main-a1-installations-activity-that-you-need-pre-application-advice-about',
        next: '/will-you-be-operating-standby-generators-within-a-data-centre'
      },

      fields: [
        {
          title:
            'What is or will be your main A1 installations activity that you need pre-application advice about?',
          payload: {
            empty: { MYHGhL: '' },
            valid: {
              MYHGhL:
                'Combustion (on site aggregated rated thermal input of 50 megawatts or more)'
            }
          },

          errors: {
            empty: 'Select energy activity type'
          }
        }
      ]
    },

    /**
     * Question page 6
     */
    {
      heading1:
        'Will you be operating standby generators within a data centre?',

      paths: {
        previous:
          '/what-is-or-will-be-your-main-a1-installations-activity-that-you-need-pre-application-advice-about',
        current:
          '/will-you-be-operating-standby-generators-within-a-data-centre',
        next: '/co2-capture'
      },

      fields: [
        {
          title:
            'Will you be operating standby generators within a data centre?',
          payload: {
            empty: { FWvNGn: '' },
            valid: { FWvNGn: 'true' }
          },

          errors: {
            empty: 'Select data centre'
          }
        }
      ]
    }
  ]

  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  /** @type {BoundFunctions<typeof queries>} */
  let container

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'conditions-complex-cond-order-1.json',
      formFilePath: resolve(import.meta.dirname, '../form/definitions')
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}${journey[0].paths.current}`
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  describe.each(journey)(
    'Page: $paths.current',
    ({ heading1, paths, fields = [] }) => {
      beforeEach(async () => {
        ;({ container } = await renderResponse(server, {
          url: `${basePath}${paths.current}`,
          headers
        }))
      })

      if (paths.previous) {
        it('should render the back link', () => {
          const $backLink = container.getByRole('link', {
            name: 'Back'
          })

          expect($backLink).toBeInTheDocument()
          expect($backLink).toHaveAttribute(
            'href',
            `${basePath}${paths.previous}`
          )
        })
      }

      it('should render the page heading', () => {
        const $heading = container.getByRole('heading', {
          name: heading1,
          level: 1
        })

        expect($heading).toBeInTheDocument()
      })

      if (paths.next) {
        it('should show errors when invalid on submit', async () => {
          const payload = {}

          for (const field of fields) {
            Object.assign(payload, field.payload.empty)
          }

          // Submit form with empty values
          const { container, response } = await renderResponse(server, {
            url: `${basePath}${paths.current}`,
            method: 'POST',
            headers,
            payload: { ...payload, crumb: csrfToken }
          })

          expect(response.statusCode).toBe(StatusCodes.OK)
          expect(response.headers.location).toBeUndefined()

          const $errorSummary = container.getByRole('alert')
          const $errorItems = within($errorSummary).getAllByRole('listitem')

          const $heading = within($errorSummary).getByRole('heading', {
            name: 'There is a problem',
            level: 2
          })

          expect($heading).toBeInTheDocument()

          for (const [index, { errors }] of fields.entries()) {
            expect($errorItems[index]).toHaveTextContent(errors.empty)
          }
        })

        it('should redirect to the next page on submit', async () => {
          const payload = {}

          for (const field of fields) {
            Object.assign(payload, field.payload.valid)
          }

          // Submit form with populated values
          const response = await server.inject({
            url: `${basePath}${paths.current}`,
            method: 'POST',
            headers,
            payload: { ...payload, crumb: csrfToken }
          })

          expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
          expect(response.headers.location).toBe(`${basePath}${paths.next}`)
        })
      }
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { BoundFunctions, queries } from '@testing-library/dom'
 */
