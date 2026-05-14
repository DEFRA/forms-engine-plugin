// @ts-nocheck

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

describe('renderPage', () => {
  beforeEach(() => {
    environment.render.mockReturnValue('<h1 class="govuk-heading-l">Page</h1>')
  })

  it('calls environment.render with the template name from context.page.viewName', () => {
    renderPage({ pageTitle: 'Test', page: { viewName: 'index' } })
    expect(environment.render).toHaveBeenCalledWith(
      'index.html',
      expect.objectContaining({ pageTitle: 'Test' })
    )
  })

  it('overrides baseLayoutPath with preview-layout.html', () => {
    renderPage({
      pageTitle: 'Test',
      baseLayoutPath: 'something-else.html',
      page: { viewName: 'summary' }
    })
    expect(environment.render).toHaveBeenCalledWith(
      'summary.html',
      expect.objectContaining({ baseLayoutPath: 'preview-layout.html' })
    )
  })

  it('returns the rendered HTML string', () => {
    environment.render.mockReturnValue('<h1>Check your answers</h1>')
    const result = renderPage({
      pageTitle: 'Check your answers',
      page: { viewName: 'summary' }
    })
    expect(result).toBe('<h1>Check your answers</h1>')
  })

  it('replaces <form> tags with divs to prevent form submission', () => {
    environment.render.mockReturnValue(
      '<form method="post" novalidate><button class="govuk-button">Continue</button></form>'
    )
    const result = renderPage({
      pageTitle: 'Test',
      page: { viewName: 'index' }
    })
    expect(result).not.toContain('<form')
    expect(result).not.toContain('</form>')
    expect(result).toContain('<div class="app-page-preview__form">')
    expect(result).toContain('</div>')
  })
})

describe('writePagePreviewPartial', () => {
  beforeEach(() => {
    environment.render.mockReturnValue('<div>page html</div>')
    buildPartialMdx.mockReturnValue('<Preview MDX />')
  })

  it('creates the output directory', () => {
    writePagePreviewPartial('/out/_previews', 'page-controller', {
      context: { pageTitle: 'Question', page: { viewName: 'index' } }
    })
    expect(mkdirSync).toHaveBeenCalledWith('/out/_previews', {
      recursive: true
    })
  })

  it('writes MDX to the correct path', () => {
    writePagePreviewPartial('/out/_previews', 'summary-page-controller', {
      context: {
        pageTitle: 'Check your answers',
        page: { viewName: 'summary' }
      }
    })
    expect(writeFileSync).toHaveBeenCalledWith(
      '/out/_previews/summary-page-controller.mdx',
      '<Preview MDX />'
    )
  })

  it('passes a single unlabelled render to buildPartialMdx for a flat fixture', () => {
    writePagePreviewPartial('/out/_previews', 'page-controller', {
      context: { pageTitle: 'Question', page: { viewName: 'index' } }
    })
    expect(buildPartialMdx).toHaveBeenCalledWith(
      [{ html: '<div>page html</div>' }],
      'component-preview component-preview--page'
    )
  })

  it('passes labelled renders to buildPartialMdx for a variant fixture', () => {
    writePagePreviewPartial('/out/_previews', 'file-upload-page-controller', {
      variants: [
        {
          label: 'No files uploaded',
          context: { pageTitle: 'Upload', page: { viewName: 'file-upload' } }
        },
        {
          label: 'With files uploaded',
          context: { pageTitle: 'Upload', page: { viewName: 'file-upload' } }
        }
      ]
    })
    expect(buildPartialMdx).toHaveBeenCalledWith(
      [
        { label: 'No files uploaded', html: '<div>page html</div>' },
        { label: 'With files uploaded', html: '<div>page html</div>' }
      ],
      'component-preview component-preview--page'
    )
  })

  it('renders each variant context independently', () => {
    environment.render
      .mockReturnValueOnce('<div>empty</div>')
      .mockReturnValueOnce('<div>with files</div>')

    writePagePreviewPartial('/out/_previews', 'file-upload-page-controller', {
      variants: [
        {
          label: 'No files uploaded',
          context: {
            pageTitle: 'Upload',
            formAction: null,
            page: { viewName: 'file-upload' }
          }
        },
        {
          label: 'With files uploaded',
          context: {
            pageTitle: 'Upload',
            formAction: 'preview',
            page: { viewName: 'file-upload' }
          }
        }
      ]
    })

    expect(environment.render).toHaveBeenCalledTimes(2)
    expect(environment.render).toHaveBeenNthCalledWith(
      1,
      'file-upload.html',
      expect.objectContaining({ formAction: null })
    )
    expect(environment.render).toHaveBeenNthCalledWith(
      2,
      'file-upload.html',
      expect.objectContaining({ formAction: 'preview' })
    )
  })
})
