import fs from 'fs'
import path from 'path'

import { buildPartialMdx } from './generate-component-previews.js'

import { environment } from '~/src/server/plugins/nunjucks/environment.js'

/**
 * Render a single page fixture context to an HTML string.
 * Reads the view name from context.page.viewName — set automatically by the
 * real page controller via getViewModel, or manually on the page stub for
 * fixtures that don't use pageViewContext.
 * Passes baseLayoutPath: 'preview-layout.html' to strip the GOV.UK page wrapper.
 * @param {object} context
 * @returns {string}
 */
export function renderPage(context) {
  const html = environment.render(`${context.page.viewName}.html`, {
    ...context,
    baseLayoutPath: 'preview-layout.html'
  })
  return html
    .replace(/<form\b[^>]*>/g, '<div class="app-page-preview__form">')
    .replace(/<\/form>/g, '</div>')
    .replace(/href="[^"]*"/g, 'href="#"')
}

/**
 * Renders all variants (or single context) for a page fixture and writes the
 * MDX partial to previewsDir/<slug>.mdx.
 * @param {string} previewsDir
 * @param {string} slug
 * @param {{ context?: object, variants?: Array<{label: string, context: object}> }} fixture
 */
export function writePagePreviewPartial(previewsDir, slug, fixture) {
  fs.mkdirSync(previewsDir, { recursive: true })

  const renders = fixture.variants
    ? fixture.variants.map(({ label, context }) => ({
        label,
        html: renderPage(context)
      }))
    : [{ html: renderPage(fixture.context) }]

  fs.writeFileSync(
    path.join(previewsDir, `${slug}.mdx`),
    buildPartialMdx(renders, 'component-preview component-preview--page')
  )
}
