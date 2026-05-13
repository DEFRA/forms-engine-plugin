import fs from 'fs'
import path from 'path'

import { buildPartialMdx } from './generate-component-previews.js'

import { environment } from '~/src/server/plugins/nunjucks/environment.js'

/**
 * Render a single page fixture context to an HTML string.
 * Passes baseLayoutPath: 'preview-layout.html' to strip the GOV.UK page wrapper,
 * leaving only the {% block content %} output from the page template.
 * @param {object} context
 * @param {string} viewName
 * @returns {string}
 */
export function renderPage(context, viewName) {
  const html = environment.render(`${viewName}.html`, {
    ...context,
    baseLayoutPath: 'preview-layout.html'
  })
  return html
    .replace(/<form\b[^>]*>/g, '<div class="app-page-preview__form">')
    .replace(/<\/form>/g, '</div>')
}

/**
 * Renders all variants (or single context) for a page fixture and writes the
 * MDX partial to previewsDir/<slug>.mdx.
 * @param {string} previewsDir
 * @param {string} slug
 * @param {{ viewName: string, context?: object, variants?: Array<{label: string, context: object}> }} fixture
 */
export function writePagePreviewPartial(previewsDir, slug, fixture) {
  fs.mkdirSync(previewsDir, { recursive: true })

  const renders = fixture.variants
    ? fixture.variants.map(({ label, context }) => ({
        label,
        html: renderPage(context, fixture.viewName)
      }))
    : [{ html: renderPage(fixture.context, fixture.viewName) }]

  fs.writeFileSync(
    path.join(previewsDir, `${slug}.mdx`),
    buildPartialMdx(renders, 'component-preview component-preview--page')
  )
}
