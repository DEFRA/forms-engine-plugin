import { resolve } from 'node:path'

import { within } from '@testing-library/dom'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { FormAction } from '~/src/server/routes/types.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/errors-translated`

const emptyDetails = {
  name: '',
  code: '',
  age: '',
  email: '',
  date__day: '',
  date__month: '',
  date__year: '',
  hours: ['1', '2']
}

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Welsh validation errors', () => {
  /** @type {Server} */
  let server

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'errors-translated.js',
      formFilePath: resolve(import.meta.dirname, 'definitions'),
      enforceCsrf: false
    })

    await server.initialize()
  })

  beforeEach(async () => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    const response = await server.inject({
      url: `${basePath}/details?language=cy`
    })

    headers = getCookieHeader(response, 'session')
  })

  afterAll(async () => {
    await server.stop()
  })

  /**
   * @param {string} path
   * @param {object} payload
   */
  async function getErrorSummary(path, payload) {
    const { container } = await renderResponse(server, {
      url: `${basePath}${path}`,
      method: 'POST',
      headers,
      payload
    })

    return container.getByRole('alert')
  }

  it('shows the field errors in Welsh', async () => {
    const $errorSummary = await getErrorSummary('/details', {
      ...emptyDetails,
      name: 'ab',
      code: 'abc',
      age: 'abc',
      email: 'abc',
      hours: '1'
    })

    const links = within($errorSummary)
      .getAllByRole('link')
      .map(($link) => [$link.textContent.trim(), $link.getAttribute('href')])

    expect(links).toEqual([
      ['Rhaid i Welsh Name fod yn 3 o nodau neu fwy', '#name'],
      ['Nodwch welsh Code dilys', '#code'],
      ['Rhaid i Welsh Age fod yn rhif', '#age'],
      ['Nodwch welsh Email yn y fformat cywir', '#email'],
      ["Dewiswch o leiaf ddau opsiwn o'r rhestr", '#hours']
    ])
  })

  it('shows the date error in Welsh', async () => {
    const $errorSummary = await getErrorSummary('/details', {
      ...emptyDetails,
      date__day: '31',
      date__month: '2',
      date__year: '2021'
    })

    expect(
      within($errorSummary).getByRole('link', {
        name: 'Rhaid i Welsh Date fod yn ddyddiad go iawn'
      })
    ).toHaveAttribute('href', '#date__day')
  })

  it('shows the repeater error in Welsh', async () => {
    await server.inject({
      url: `${basePath}/details`,
      method: 'POST',
      headers,
      payload: emptyDetails
    })

    await server.inject({
      url: `${basePath}/people/${crypto.randomUUID()}`,
      method: 'POST',
      headers,
      payload: { person: 'Ann' }
    })

    const $errorSummary = await getErrorSummary('/people/summary', {
      action: FormAction.Continue
    })

    expect($errorSummary).toHaveTextContent(
      'Rhaid i chi ychwanegu o leiaf ddau gateb'
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
