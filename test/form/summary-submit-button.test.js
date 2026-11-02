import { join } from 'node:path'

import { initDebounceClick } from '~/src/client/javascripts/debounce-click.js'
import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/minimal`

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Page: /summary submit button', () => {
  /** @type {Server} */
  let server

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'minimal.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()

    const response = await server.inject({
      url: `${basePath}/start`
    })

    const csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])

    await server.inject({
      url: `${basePath}/start`,
      method: 'POST',
      headers,
      payload: {
        crumb: csrfToken,
        field: 'value'
      }
    })
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('only submits the form once when the submit button is clicked twice in quick succession', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/summary`,
      headers
    })

    // Wire up the client-side JS against the real rendered page, as
    // application.js does in the browser via initAll()
    initDebounceClick()

    const $form = /** @type {HTMLFormElement} */ (
      container.getByRole('button', { name: 'Submit' }).closest('form')
    )
    const $submit = container.getByRole('button', { name: 'Submit' })

    const onSubmit = jest.fn((/** @type {Event} */ event) =>
      // Stop jsdom attempting a real navigation
      event.preventDefault()
    )
    $form.addEventListener('submit', onSubmit)

    $submit.click()
    $submit.click()

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
