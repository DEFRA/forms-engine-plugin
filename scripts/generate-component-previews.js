/**
 * @typedef {import('../.server/server/plugins/engine/models/FormModel.js').FormModel} FormModel
 */

import fs from 'fs'
import path from 'path'

import { markdownToHtml } from '@defra/forms-model'

// Static imports so Jest can mock them (dynamic computed-path imports cannot be mocked).
// Requires `npm run build` to have produced `.server/` before running this script.
import { createComponent } from '../.server/server/plugins/engine/components/helpers/components.js'
import { environment } from '../.server/server/plugins/nunjucks/environment.js'

// Register the markdown filter that the engine plugin normally adds at server init.
environment.addFilter('markdown', (text, startingHeaderLevel) =>
  markdownToHtml(text, { startingHeaderLevel })
)

const COMPONENT_LIST_TEMPLATE = `{% from "partials/components.html" import componentList %}{{ componentList(components) }}`

/**
 * Render a single component fixture to an HTML string.
 * @param {import('./component-preview-fixtures.js').FixtureRender} fixture
 * @returns {string}
 */
export function renderComponent(fixture) {
  // Fixtures use FixtureModel stubs (partial) — FormModel is required by the constructor
  // but components only access the properties each stub provides at render time.
  const model = /** @type {FormModel} */ (
    /** @type {unknown} */ (fixture.model)
  )
  const component = createComponent(fixture.def, { model })
  const viewModel = component.getViewModel(fixture.payload, [])

  // Apply large label/legend sizing to match how QuestionPageController styles
  // a single-component page. isPageHeading is intentionally omitted — setting it
  // causes GOV.UK Frontend to render an <h1>, which breaks heading hierarchy
  // inside the docs page where the preview sits under a <h2>.
  const labelOrLegend = viewModel.fieldset?.legend ?? viewModel.label
  if (labelOrLegend) {
    labelOrLegend.classes = viewModel.fieldset?.legend
      ? 'govuk-fieldset__legend--s'
      : 'govuk-label--s'
  }

  return environment.renderString(COMPONENT_LIST_TEMPLATE, {
    components: [{ type: fixture.def.type, model: viewModel }]
  })
}

/**
 * Build the MDX partial content from one or more rendered HTML strings.
 * @param {Array<{ label?: string, html: string }>} renders
 * @returns {string}
 */
export function buildPartialMdx(renders) {
  return renders
    .map(({ label, html }) => {
      const escaped = html.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
      const safeLabel = label
        ? label
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\{/g, '&#123;')
            .replace(/\}/g, '&#125;')
        : ''
      const labelLine = safeLabel
        ? `<h3 className="govuk-heading-s">${safeLabel}</h3>\n`
        : ''
      return `${labelLine}<div className="component-preview">\n  <div dangerouslySetInnerHTML={{ __html: \`${escaped}\` }} />\n</div>`
    })
    .join('\n\n')
}

const MAP_PLACEHOLDER =
  `<div class="app-map-placeholder">` +
  `<p class="govuk-body govuk-!-margin-bottom-0">` +
  `Map appears here with JavaScript enabled` +
  `</p></div>`

/**
 * Renders all variants for a component and writes the MDX partial to _previews/<slug>.mdx.
 * @param {string} previewsDir - absolute path to the _previews/ directory
 * @param {string} slug - e.g. 'text-field'
 * @param {import('./component-preview-fixtures.js').Fixture} fixture
 */
export function writePreviewPartial(previewsDir, slug, fixture) {
  fs.mkdirSync(previewsDir, { recursive: true })

  const appendHtml = fixture.mapPlaceholder ? `\n${MAP_PLACEHOLDER}` : ''

  let renders
  if ('variants' in fixture) {
    renders = fixture.variants.map((variant) => ({
      label: variant.label,
      html: renderComponent(variant) + appendHtml
    }))
  } else {
    renders = [{ html: renderComponent(fixture) + appendHtml }]
  }

  const content = buildPartialMdx(renders)
  fs.writeFileSync(path.join(previewsDir, `${slug}.mdx`), content)
}
