jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}))

jest.mock('~/src/server/plugins/nunjucks/environment.js', () => ({
  environment: { render: jest.fn() }
}))

jest.mock('./generate-component-previews.js', () => ({
  buildPartialMdx: jest.fn().mockReturnValue('<Preview MDX />')
}))

import { mkdirSync, writeFileSync } from 'fs'

import { buildPartialMdx } from './generate-component-previews.js'
import {
  renderPage,
  writePagePreviewPartial
} from './generate-page-previews.js'

import { environment } from '~/src/server/plugins/nunjucks/environment.js'

const mockRender = /** @type {jest.Mock<string>} */ (environment.render)
const mockBuildPartialMdx = /** @type {jest.Mock<string>} */ (buildPartialMdx)

describe('renderPage', () => {
  beforeEach(() => {
    mockRender.mockReturnValue('<h1 class="govuk-heading-l">Page</h1>')
  })

  it('calls environment.render with the template name from context.page.viewName', () => {
    renderPage(
      /** @type {any} */ ({ pageTitle: 'Test', page: { viewName: 'index' } })
    )
    expect(mockRender).toHaveBeenCalledWith(
      'index.html',
      expect.objectContaining({ pageTitle: 'Test' })
    )
  })

  it('overrides baseLayoutPath with preview-layout.html', () => {
    renderPage(
      /** @type {any} */ ({
        pageTitle: 'Test',
        baseLayoutPath: 'something-else.html',
        page: { viewName: 'summary' }
      })
    )
    expect(mockRender).toHaveBeenCalledWith(
      'summary.html',
      expect.objectContaining({ baseLayoutPath: 'preview-layout.html' })
    )
  })

  it('returns the rendered HTML string', () => {
    mockRender.mockReturnValue('<h1>Check your answers</h1>')
    const result = renderPage(
      /** @type {any} */ ({
        pageTitle: 'Check your answers',
        page: { viewName: 'summary' }
      })
    )
    expect(result).toBe('<h1>Check your answers</h1>')
  })

  it('replaces all href values with # to neutralise links', () => {
    mockRender.mockReturnValue(
      '<a href="/some/path" class="govuk-link">Change</a><a href="/another?q=1">Remove</a>'
    )
    const result = renderPage(
      /** @type {any} */ ({ pageTitle: 'Test', page: { viewName: 'index' } })
    )
    expect(result).not.toContain('href="/some/path"')
    expect(result).not.toContain('href="/another?q=1"')
    expect(result).toContain('href="#"')
  })

  it('replaces <form> tags with divs to prevent form submission', () => {
    mockRender.mockReturnValue(
      '<form method="post" novalidate><button class="govuk-button">Continue</button></form>'
    )
    const result = renderPage(
      /** @type {any} */ ({ pageTitle: 'Test', page: { viewName: 'index' } })
    )
    expect(result).not.toContain('<form')
    expect(result).not.toContain('</form>')
    expect(result).toContain('<div class="app-page-preview__form">')
    expect(result).toContain('</div>')
  })
})

describe('writePagePreviewPartial', () => {
  beforeEach(() => {
    mockRender.mockReturnValue('<div>page html</div>')
    mockBuildPartialMdx.mockReturnValue('<Preview MDX />')
  })

  it('creates the output directory', () => {
    writePagePreviewPartial('/out/_previews', 'page-controller', {
      context: /** @type {any} */ ({
        pageTitle: 'Question',
        page: { viewName: 'index' }
      })
    })
    expect(mkdirSync).toHaveBeenCalledWith('/out/_previews', {
      recursive: true
    })
  })

  it('writes MDX to the correct path', () => {
    writePagePreviewPartial('/out/_previews', 'summary-page-controller', {
      context: /** @type {any} */ ({
        pageTitle: 'Check your answers',
        page: { viewName: 'summary' }
      })
    })
    expect(writeFileSync).toHaveBeenCalledWith(
      '/out/_previews/summary-page-controller.mdx',
      '<Preview MDX />'
    )
  })

  it('passes a single unlabelled render to buildPartialMdx for a flat fixture', () => {
    writePagePreviewPartial('/out/_previews', 'page-controller', {
      context: /** @type {any} */ ({
        pageTitle: 'Question',
        page: { viewName: 'index' }
      })
    })
    expect(mockBuildPartialMdx).toHaveBeenCalledWith(
      [{ html: '<div>page html</div>' }],
      'component-preview component-preview--page app-no-prose'
    )
  })

  it('passes labelled renders to buildPartialMdx for a variant fixture', () => {
    writePagePreviewPartial('/out/_previews', 'file-upload-page-controller', {
      variants: [
        {
          label: 'No files uploaded',
          context: /** @type {any} */ ({
            pageTitle: 'Upload',
            page: { viewName: 'file-upload' }
          })
        },
        {
          label: 'With files uploaded',
          context: /** @type {any} */ ({
            pageTitle: 'Upload',
            page: { viewName: 'file-upload' }
          })
        }
      ]
    })
    expect(mockBuildPartialMdx).toHaveBeenCalledWith(
      [
        { label: 'No files uploaded', html: '<div>page html</div>' },
        { label: 'With files uploaded', html: '<div>page html</div>' }
      ],
      'component-preview component-preview--page app-no-prose'
    )
  })

  it('renders each variant context independently', () => {
    mockRender
      .mockReturnValueOnce('<div>empty</div>')
      .mockReturnValueOnce('<div>with files</div>')

    writePagePreviewPartial('/out/_previews', 'file-upload-page-controller', {
      variants: [
        {
          label: 'No files uploaded',
          context: /** @type {any} */ ({
            pageTitle: 'Upload',
            formAction: null,
            page: { viewName: 'file-upload' }
          })
        },
        {
          label: 'With files uploaded',
          context: /** @type {any} */ ({
            pageTitle: 'Upload',
            formAction: 'preview',
            page: { viewName: 'file-upload' }
          })
        }
      ]
    })

    expect(mockRender).toHaveBeenCalledTimes(2)
    expect(mockRender).toHaveBeenNthCalledWith(
      1,
      'file-upload.html',
      expect.objectContaining({ formAction: null })
    )
    expect(mockRender).toHaveBeenNthCalledWith(
      2,
      'file-upload.html',
      expect.objectContaining({ formAction: 'preview' })
    )
  })
})
