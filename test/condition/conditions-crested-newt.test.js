import { resolve } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/conditions-crested-newt`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Form journey', () => {
  const journey = [
    /**
     * Question page 1
     */
    {
      heading1: 'Before you start',

      paths: {
        current: '/before-you-start'
      },

      fields: [
        {
          title: 'Before you start',
          payload: {
            empty: {},
            valid: {}
          },

          errors: {
            empty: ''
          }
        }
      ]
    },

    /**
     * Question page 2
     */
    {
      heading1: 'What is your name?',

      paths: {
        previous: '/before-you-start',
        current: '/what-is-your-name',
        next: '/have-your-contact-details-changed-since-your-registration-or-last-renewal'
      },

      fields: [
        {
          title: 'What is your name?',
          payload: {
            empty: { tYzJxB: '' },
            valid: {
              tYzJxB: 'John',
              YBXSrh: 'Smith'
            }
          },

          errors: {
            empty: 'Enter first name'
          }
        }
      ]
    },

    /**
     * Question page 3
     */
    {
      heading1:
        'Have your contact details changed since your registration or last renewal?',

      paths: {
        previous: '/what-is-your-name',
        current:
          '/have-your-contact-details-changed-since-your-registration-or-last-renewal',
        next: '/which-of-your-contact-details-have-changed-since-your-registration-or-last-renewal'
      },

      fields: [
        {
          title:
            'Have your contact details changed since your registration or last renewal?',
          payload: {
            empty: { ycsEmC: '' },
            valid: { ycsEmC: 'Yes' }
          },

          errors: {
            empty: 'Select contact details changed'
          }
        }
      ]
    },

    /**
     * Question page 4
     */
    {
      heading1:
        'Which of your contact details have changed since your registration or last renewal?',

      paths: {
        previous:
          '/have-your-contact-details-changed-since-your-registration-or-last-renewal',
        current:
          '/which-of-your-contact-details-have-changed-since-your-registration-or-last-renewal',
        next: '/update-your-name'
      },

      fields: [
        {
          title:
            'Which of your contact details have changed since your registration or last renewal?',
          payload: {
            empty: { EhzlBB: '' },
            valid: {
              EhzlBB: ['Name', 'Address']
            }
          },

          errors: {
            empty: 'Select contact details changed'
          }
        }
      ]
    },

    /**
     * Question page 5
     */
    {
      heading1: 'Update your name',

      paths: {
        previous:
          '/which-of-your-contact-details-have-changed-since-your-registration-or-last-renewal',
        current: '/update-your-name',
        next: '/what-is-your-new-address'
      },

      fields: [
        {
          title: 'Update your name',
          payload: {
            empty: { UIBCeA: '' },
            valid: {
              UIBCeA: 'John2',
              hzLefN: 'Smith2'
            }
          },

          errors: {
            empty: 'Enter updated first name'
          }
        }
      ]
    },

    /**
     * Go back to Question page 3
     */
    {
      heading1:
        'Have your contact details changed since your registration or last renewal?',

      paths: {
        previous: '/what-is-your-name',
        current:
          '/have-your-contact-details-changed-since-your-registration-or-last-renewal',
        next: '/which-of-your-contact-details-might-have-changed-since-your-registration-or-last-renewal'
      },

      fields: [
        {
          title:
            'Have your contact details changed since your registration or last renewal?',
          payload: {
            empty: { ycsEmC: '' },
            valid: { ycsEmC: 'Not sure' }
          },

          errors: {
            empty: 'Select contact details changed'
          }
        }
      ]
    },

    /**
     * Question page 6
     */
    {
      heading1:
        'Which of your contact details might have changed since your registration or last renewal?',

      paths: {
        previous:
          '/have-your-contact-details-changed-since-your-registration-or-last-renewal',
        current:
          '/which-of-your-contact-details-might-have-changed-since-your-registration-or-last-renewal',
        next: '/update-your-name'
      },

      fields: [
        {
          title:
            'Which of your contact details might have changed since your registration or last renewal?',
          payload: {
            empty: { TxIdxa: '' },
            valid: {
              TxIdxa: ['Name', 'Address', 'Email address']
            }
          },

          errors: {
            empty: 'Select contact details changed'
          }
        }
      ]
    },

    /**
     * Go back to Question page 3
     */
    {
      heading1:
        'Have your contact details changed since your registration or last renewal?',

      paths: {
        previous: '/what-is-your-name',
        current:
          '/have-your-contact-details-changed-since-your-registration-or-last-renewal',
        next: '/what-is-your-email-address'
      },

      fields: [
        {
          title:
            'Have your contact details changed since your registration or last renewal?',
          payload: {
            empty: { ycsEmC: '' },
            valid: { ycsEmC: 'No' }
          },

          errors: {
            empty: 'Select contact details changed'
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
      formFileName: 'conditions-crested-newt.json',
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
