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

  it('calls environment.render with the correct template name', () => {
    renderPage({ pageTitle: 'Test' }, 'index')
    expect(environment.render).toHaveBeenCalledWith(
      'index.html',
      expect.objectContaining({ pageTitle: 'Test' })
    )
  })

  it('overrides baseLayoutPath with preview-layout.html', () => {
    renderPage(
      { pageTitle: 'Test', baseLayoutPath: 'something-else.html' },
      'summary'
    )
    expect(environment.render).toHaveBeenCalledWith(
      'summary.html',
      expect.objectContaining({ baseLayoutPath: 'preview-layout.html' })
    )
  })

  it('returns the rendered HTML string', () => {
    environment.render.mockReturnValue('<h1>Check your answers</h1>')
    const result = renderPage({ pageTitle: 'Check your answers' }, 'summary')
    expect(result).toBe('<h1>Check your answers</h1>')
  })
})

describe('writePagePreviewPartial', () => {
  beforeEach(() => {
    environment.render.mockReturnValue('<div>page html</div>')
    buildPartialMdx.mockReturnValue('<Preview MDX />')
  })

  it('creates the output directory', () => {
    writePagePreviewPartial('/out/_previews', 'page-controller', {
      viewName: 'index',
      context: { pageTitle: 'Question' }
    })
    expect(mkdirSync).toHaveBeenCalledWith('/out/_previews', {
      recursive: true
    })
  })

  it('writes MDX to the correct path', () => {
    writePagePreviewPartial('/out/_previews', 'summary-page-controller', {
      viewName: 'summary',
      context: { pageTitle: 'Check your answers' }
    })
    expect(writeFileSync).toHaveBeenCalledWith(
      '/out/_previews/summary-page-controller.mdx',
      '<Preview MDX />'
    )
  })

  it('passes a single unlabelled render to buildPartialMdx for a flat fixture', () => {
    writePagePreviewPartial('/out/_previews', 'page-controller', {
      viewName: 'index',
      context: { pageTitle: 'Question' }
    })
    expect(buildPartialMdx).toHaveBeenCalledWith([
      { html: '<div>page html</div>' }
    ])
  })

  it('passes labelled renders to buildPartialMdx for a variant fixture', () => {
    writePagePreviewPartial('/out/_previews', 'file-upload-page-controller', {
      viewName: 'file-upload',
      variants: [
        { label: 'No files uploaded', context: { pageTitle: 'Upload' } },
        { label: 'With files uploaded', context: { pageTitle: 'Upload' } }
      ]
    })
    expect(buildPartialMdx).toHaveBeenCalledWith([
      { label: 'No files uploaded', html: '<div>page html</div>' },
      { label: 'With files uploaded', html: '<div>page html</div>' }
    ])
  })

  it('renders each variant context independently', () => {
    environment.render
      .mockReturnValueOnce('<div>empty</div>')
      .mockReturnValueOnce('<div>with files</div>')

    writePagePreviewPartial('/out/_previews', 'file-upload-page-controller', {
      viewName: 'file-upload',
      variants: [
        {
          label: 'No files uploaded',
          context: { pageTitle: 'Upload', formAction: null }
        },
        {
          label: 'With files uploaded',
          context: { pageTitle: 'Upload', formAction: 'preview' }
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
