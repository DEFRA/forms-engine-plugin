import { join } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/fields-required-translated`

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Form fields (required)', () => {
  const journey = [
    {
      heading1: 'Welsh fields required translated',

      paths: {
        current: '/components',
        next: '/summary'
      },

      fields: [
        {
          name: 'textField',
          title: 'Text field',
          payload: {
            empty: { textField: '' },
            invalid: { textField: 'This text is too long for the field' },
            valid: { textField: 'Example text field' }
          }
        },
        {
          title: 'Multiline text field',
          value: 'Example multiline text field',
          payload: {
            empty: { multilineTextField: '' },
            invalid: {
              multilineTextField: 'This text is too long for the field'
            },
            valid: { multilineTextField: 'Example multiline text field' }
          }
        },
        {
          title: 'Number field',
          payload: {
            empty: { numberField: '' },
            invalid: { numberField: '123456' },
            valid: { numberField: '1234' }
          }
        },
        {
          name: 'datePartsField',
          title: 'Date parts field',
          payload: {
            empty: {
              datePartsField__day: '',
              datePartsField__month: '',
              datePartsField__year: ''
            },
            invalid: {
              datePartsField__day: '32',
              datePartsField__month: '13',
              datePartsField__year: '3100'
            },
            valid: {
              datePartsField__day: '31',
              datePartsField__month: '12',
              datePartsField__year: '2021'
            }
          }
        },
        {
          name: 'monthYearField',
          title: 'Month year field',
          payload: {
            empty: {
              monthYearField__month: '',
              monthYearField__year: ''
            },
            invalid: {
              monthYearField__month: '13',
              monthYearField__year: '2021'
            },
            valid: {
              monthYearField__month: '12',
              monthYearField__year: '2021'
            }
          }
        },
        {
          name: 'yesNoField',
          title: 'Yes/No field',
          payload: {
            empty: {},
            invalid: {},
            valid: { yesNoField: 'true' }
          }
        },
        {
          name: 'emailAddressField',
          title: 'Email address field',
          payload: {
            empty: { emailAddressField: '' },
            invalid: { emailAddressField: 'defra.helpline' },
            invalid2: { emailAddressField: 'defra–helpline@endash.com' },
            valid: { emailAddressField: 'defra.helpline@defra.gov.uk' }
          }
        },
        {
          name: 'telephoneNumberField',
          title: 'Telephone number field',
          payload: {
            empty: { telephoneNumberField: '' },
            invalid: { telephoneNumberField: '44790000' },
            valid: { telephoneNumberField: '+447900000000' }
          }
        },
        {
          name: 'addressField',
          title: 'Address field',
          payload: {
            empty: {
              addressField__addressLine1: '',
              addressField__addressLine2: '',
              addressField__town: '',
              addressField__county: '',
              addressField__postcode: '',
              addressField__uprn: ''
            },
            invalid: {
              addressField__addressLine1: 'Richard Fairclough House',
              addressField__addressLine2: '',
              addressField__town: 'Warrington',
              addressField__county: '',
              addressField__postcode: 'ABC',
              addressField__uprn: ''
            },
            valid: {
              addressField__addressLine1: 'Richard Fairclough House',
              addressField__addressLine2: 'Knutsford Road',
              addressField__town: 'Warrington',
              addressField__county: 'Cheshire',
              addressField__postcode: 'WA4 1HT',
              addressField__uprn: ''
            }
          }
        },
        {
          name: 'radiosField',
          title: 'Radios field',
          payload: {
            empty: {},
            invalid: {},
            valid: { radiosField: 'privateLimitedCompany' }
          }
        },
        {
          name: 'selectField',
          title: 'Select field',
          payload: {
            empty: { selectField: '' },
            invalid: { selectField: '' },
            valid: { selectField: '910400158' }
          }
        },
        {
          name: 'autocompleteField',
          title: 'Autocomplete field',
          payload: {
            empty: { autocompleteField: '' },
            invalid: { autocompleteField: '' },
            valid: { autocompleteField: '910400184' }
          }
        },
        {
          name: 'checkboxesSingle',
          title: 'Checkboxes field 1',
          payload: {
            empty: {},
            invalid: {},
            valid: { checkboxesSingle: 'Arabian' }
          }
        },
        {
          name: 'checkboxesMultiple',
          title: 'Checkboxes field 2',
          payload: {
            empty: {},
            invalid: {},
            valid: { checkboxesMultiple: 'Patomine' }
          }
        },
        {
          name: 'checkboxesSingleNumber',
          title: 'Checkboxes field 3 (number)',
          payload: {
            empty: {},
            invalid: {},
            valid: { checkboxesSingleNumber: '0' }
          }
        },
        {
          name: 'checkboxesMultipleNumber',
          title: 'Checkboxes field at least 2 items',
          payload: {
            empty: {},
            invalid: {},
            invalid2: { checkboxesMultipleNumber: ['1'] },
            valid: { checkboxesMultipleNumber: ['1', '2'] }
          }
        },
        {
          name: 'eastingNorthing',
          title: 'EastingNorthing field',
          payload: {
            empty: {
              eastingNorthing__easting: '',
              eastingNorthing__northing: ''
            },
            invalid: {
              eastingNorthing__easting: '111111111',
              eastingNorthing__northing: '222222222'
            },
            valid: {
              eastingNorthing__easting: '1',
              eastingNorthing__northing: '1'
            }
          }
        },
        {
          name: 'geospatial',
          title: 'Geospatial field',
          payload: {
            empty: { geospatial: '' },
            invalid: {
              geospatial: `[
                {
                  "type": "Feature",
                  "properties": {
                    "description": "",
                    "coordinateGridReference": "SD 66261 97639",
                    "centroidGridReference": "SD 66261 97639"
                  },
                  "geometry": {
                    "type": "Point",
                    "coordinates": [
                      -2.520852,
                      54.3731392
                    ]
                  },
                  "id": "cad71663-7b1e-4b02-83f0-ae1cd7fa24f4"
                }
              ]`
            },
            invalid2: {
              geospatial: `[
                {
                  "type": "Feature",
                  "properties": {
                    "description": "p2",
                    "coordinateGridReference": "SD 66261 97639",
                    "centroidGridReference": "SD 66261 97639"
                  },
                  "geometry": {
                    "type": "Point",
                    "coordinates": [
                      -3.9161157,
                      55.533858
                    ]
                  },
                  "id": "cad71663-7b1e-4b02-83f0-ae1cd7fa24f4"
                }
              ]`
            },
            valid: {
              geospatial: `[
                {
                  "type": "Feature",
                  "properties": {
                    "description": "p1",
                    "coordinateGridReference": "SD 66261 97639",
                    "centroidGridReference": "SD 66261 97639"
                  },
                  "geometry": {
                    "type": "Point",
                    "coordinates": [
                      -2.520852,
                      54.3731392
                    ]
                  },
                  "id": "cad71663-7b1e-4b02-83f0-ae1cd7fa24f4"
                }
              ]`
            }
          }
        },
        {
          name: 'latLong',
          title: 'LatLong field',
          payload: {
            empty: { latLong__latitude: '', latLong__longitude: '' },
            invalid: {
              latLong__latitude: '11111111',
              latLong__longitude: '2222222'
            },
            valid: { latLong__latitude: '50', latLong__longitude: '1.5' }
          }
        },
        {
          name: 'nationalGrid',
          title: 'National Grid field',
          payload: {
            empty: {},
            invalid: { nationalGrid: 'ABC' },
            valid: { nationalGrid: 'NG 1234 5678' }
          }
        },
        {
          name: 'osGrid',
          title: 'OS Grid field',
          payload: {
            empty: {},
            invalid: { osGrid: 'ABC' },
            valid: { osGrid: 'TQ123456' }
          }
        },
        {
          name: 'declaration',
          title: 'Declaration',
          payload: {
            empty: { declaration: 'unchecked' },
            invalid: { declaration: 'unchecked' },
            valid: { declaration: 'true' }
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
      formFileName: 'fields-required-translated.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}${journey[0].paths.current}?language=cy`
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])
  })

  beforeEach(() => {
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

      it('should render the page heading', () => {
        const $heading = container.getByRole('heading', {
          name: heading1,
          level: 1
        })

        expect($heading).toBeInTheDocument()
      })

      it('should render the field label without (optional)', () => {
        for (const field of fields) {
          const $label = container.getByText(`Welsh ${field.title}`)
          expect($label).toBeInTheDocument()
        }
      })

      it('should show errors when fields empty on submit', async () => {
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

        const $heading = within($errorSummary).getByRole('heading', {
          name: 'Mae problem',
          level: 2
        })

        expect($heading).toBeInTheDocument()

        const $errors = $errorSummary.querySelectorAll('a')
        expect($errors).toHaveLength(26)
        expect($errors[0].textContent).toBe('Nodwch welsh textfield error desc')
        expect($errors[1].textContent).toBe('Nodwch welsh Multiline text field')
        expect($errors[2].textContent).toBe('Nodwch Welsh Number field')
        expect($errors[3].textContent).toBe(
          'Rhaid i Welsh Date parts field gynnwys diwrnod'
        )
        expect($errors[4].textContent).toBe(
          'Rhaid i Welsh Month year field gynnwys mis'
        )
        expect($errors[5].textContent).toBe(
          'Welsh Yes/No field - dewiswch ie neu nage'
        )
        expect($errors[6].textContent).toBe('Nodwch welsh Email address field')
        expect($errors[7].textContent).toBe(
          'Nodwch welsh Telephone number field'
        )
        expect($errors[8].textContent).toBe('Nodwch llinell cyfeiriad 1')
        expect($errors[9].textContent).toBe('Nodwch tref neu ddinas')
        expect($errors[10].textContent).toBe('Nodwch cod post')
        expect($errors[11].textContent).toBe('Dewiswch welsh Radios field')
        expect($errors[12].textContent).toBe('Dewiswch welsh Select field')
        expect($errors[13].textContent).toBe('Nodwch Welsh Autocomplete field')
        expect($errors[14].textContent).toBe(
          'Dewiswch welsh Checkboxes field 1'
        )
        expect($errors[15].textContent).toBe(
          'Dewiswch welsh Checkboxes field 2'
        )
        expect($errors[16].textContent).toBe(
          'Dewiswch welsh Checkboxes field 3 (number)'
        )
        expect($errors[17].textContent).toBe(
          'Dewiswch welsh Checkboxes field at least 2 items'
        )
        expect($errors[18].textContent).toBe('Nodwch ddwyreiniannau')
        expect($errors[19].textContent).toBe('Nodwch ogleddiannau')
        expect($errors[20].textContent).toBe('Dewiswch welsh Geospatial field')
        expect($errors[21].textContent).toBe('Nodwch ledred')
        expect($errors[22].textContent).toBe('Nodwch hydred')
        expect($errors[23].textContent).toBe('Nodwch welsh National Grid field')
        expect($errors[24].textContent).toBe('Nodwch welsh OS Grid field')
        expect($errors[25].textContent).toBe(
          "Rhaid i chi gadarnhau eich bod yn deall ac yn cytuno â'r welsh Declaration i barhau"
        )
      })

      it('should show errors when fields invalid value on submit - scenario 1', async () => {
        const payload = {}

        for (const field of fields) {
          Object.assign(payload, field.payload.invalid)
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

        const $heading = within($errorSummary).getByRole('heading', {
          name: 'Mae problem',
          level: 2
        })

        expect($heading).toBeInTheDocument()

        const $errors = $errorSummary.querySelectorAll('a')
        expect($errors).toHaveLength(24)
        expect($errors[0].textContent).toBe(
          'Rhaid i Welsh textfield error desc fod yn 30 o nodau neu lai'
        )
        expect($errors[1].textContent).toBe(
          'Rhaid i Welsh Multiline text field fod yn 30 o nodau neu lai'
        )
        expect($errors[2].textContent).toBe(
          'Rhaid i Welsh Number field fod yn 2000 neu is'
        )
        expect($errors[3].textContent).toBe(
          'Rhaid i Welsh Date parts field fod yn ddyddiad go iawn'
        )
        expect($errors[4].textContent).toBe(
          'Rhaid i Welsh Month year field fod yn ddyddiad go iawn'
        )
        expect($errors[5].textContent).toBe(
          'Welsh Yes/No field - dewiswch ie neu nage'
        )
        expect($errors[6].textContent).toBe(
          'Nodwch welsh Email address field yn y fformat cywir'
        )
        expect($errors[7].textContent).toBe(
          'Nodwch welsh Telephone number field yn y fformat cywir'
        )
        expect($errors[8].textContent).toBe('Nodwch cod post dilys')
        expect($errors[9].textContent).toBe('Dewiswch welsh Radios field')
        expect($errors[10].textContent).toBe('Dewiswch welsh Select field')
        expect($errors[11].textContent).toBe('Nodwch Welsh Autocomplete field')
        expect($errors[12].textContent).toBe(
          'Dewiswch welsh Checkboxes field 1'
        )
        expect($errors[13].textContent).toBe(
          'Dewiswch welsh Checkboxes field 2'
        )
        expect($errors[14].textContent).toBe(
          'Dewiswch welsh Checkboxes field 3 (number)'
        )
        expect($errors[15].textContent).toBe(
          'Dewiswch welsh Checkboxes field at least 2 items'
        )
        expect($errors[16].textContent).toBe(
          'Rhaid i Dwyreiniannau ar gyfer welsh EastingNorthing field fod rhwng 0 a 700000'
        )
        expect($errors[17].textContent).toBe(
          'Rhaid i Gogleddiannau ar gyfer welsh EastingNorthing field fod rhwng 0 a 1300000'
        )
        expect($errors[18].textContent).toBe(
          'Rhowch ddisgrifiad ar gyfer lleoliad 1'
        )
        expect($errors[19].textContent).toBe(
          'Rhaid i ledred welsh LatLong field fod rhwng 49.85 a 60.859'
        )
        expect($errors[20].textContent).toBe(
          'Rhaid i hydred welsh LatLong field fod rhwng -13.687 a 1.767'
        )
        expect($errors[21].textContent).toBe(
          'Nodwch rif maes Grid Cenedlaethol dilys ar gyfer welsh National Grid field fel NG 1234 5678'
        )
        expect($errors[22].textContent).toBe(
          'Nodwch gyfeirnod grid AO dilys ar gyfer welsh OS Grid field fel TQ123456'
        )
        expect($errors[23].textContent).toBe(
          "Rhaid i chi gadarnhau eich bod yn deall ac yn cytuno â'r welsh Declaration i barhau"
        )
      })

      // For additional error conditions
      // Leave remaining payload alone and only test specific components that have an 'invalid2' property
      it('should show errors when fields invalid value on submit - scenario 2', async () => {
        const payload = {}

        for (const field of fields) {
          Object.assign(
            payload,
            field.payload.invalid2 ?? field.payload.invalid
          )
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

        const $heading = within($errorSummary).getByRole('heading', {
          name: 'Mae problem',
          level: 2
        })

        expect($heading).toBeInTheDocument()

        const $errors = $errorSummary.querySelectorAll('a')
        expect($errors).toHaveLength(24)
        expect($errors[6].textContent).toBe(
          'Mae Welsh Email address field yn cynnwys nodau annilys, er enghraifft, dashes hirion'
        )
        expect($errors[15].textContent).toBe(
          "Dewiswch o leiaf ddau opsiwn o'r rhestr"
        )
        expect($errors[18].textContent).toBe(
          'Rhaid i leoliad 1 fod y tu mewn i Lloegr'
        )
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
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { BoundFunctions, queries } from '@testing-library/dom'
 */
