import { resolve } from 'node:path'

import { within } from '@testing-library/dom'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  getUploadStatus,
  initiateUpload
} from '~/src/server/plugins/engine/services/uploadService.js'
import { UploadStatus } from '~/src/server/plugins/engine/types.js'
import * as fixtures from '~/test/fixtures/index.js'
import definition from '~/test/form/definitions/components-translated.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/components-translated`

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

describe('Welsh file upload, guidance and payment', () => {
  /** @type {Server} */
  let server

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'components-translated.js',
      formFilePath: resolve(import.meta.dirname, 'definitions'),
      enforceCsrf: false
    })

    await server.initialize()
  })

  beforeEach(async () => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    jest.mocked(initiateUpload).mockResolvedValue({
      uploadId: 'upload-id',
      uploadUrl: 'http://localhost/upload',
      statusUrl: 'http://localhost/status'
    })

    const response = await server.inject({
      url: `${basePath}/upload?language=cy`
    })

    headers = getCookieHeader(response, 'session')

    jest.mocked(getUploadStatus).mockResolvedValue({
      uploadStatus: UploadStatus.initiated,
      metadata: { retrievalKey: 'enrique.chase@defra.gov.uk' },
      form: {}
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  it('shows the file upload page in Welsh', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/upload`,
      headers
    })

    expect(
      container.getByRole('heading', {
        name: 'Welsh Upload your plan',
        level: 1
      })
    ).toBeInTheDocument()
    expect(
      container.getByText('Welsh Read the guidance first')
    ).toBeInTheDocument()
    expect(
      container.getByLabelText('Welsh Upload your plan')
    ).toBeInTheDocument()
  })

  it('shows the file upload error in Welsh', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/upload`,
      method: 'POST',
      headers,
      payload: {}
    })

    const $errorSummary = container.getByRole('alert')

    expect(
      within($errorSummary).getByRole('heading', {
        name: 'Mae problem',
        level: 2
      })
    ).toBeInTheDocument()
    expect(
      within($errorSummary).getByRole('link', {
        name: 'Dewiswch welsh Upload your plan'
      })
    ).toHaveAttribute('href', '#plan')
  })

  it('shows the payment page in Welsh', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/payment`,
      headers
    })

    expect(
      container.getByRole('heading', { name: 'Welsh Pay the fee', level: 2 })
    ).toBeInTheDocument()
    expect(container.getByText('Welsh Licence fee')).toBeInTheDocument()
    expect(
      container.getByRole('button', { name: 'Ychwanegu manylion talu' })
    ).toBeInTheDocument()
  })

  it('shows the payment error in Welsh', async () => {
    const model = new FormModel(definition, { basePath: 'test' })
    const [field] = model.pages[1].collection.fields
    const request = {
      server: {
        plugins: { 'forms-engine-plugin': { getLanguage: () => 'cy' } }
      }
    }

    await expect(
      // @ts-expect-error - partial request and context
      field.onSubmit(request, {}, { state: {} })
    ).rejects.toMatchObject({ userMessage: 'Cwblhewch y taliad i barhau' })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
