import fs from 'fs'
import path from 'path'

import { markdownToHtml } from '@defra/forms-model'

// Static imports so Jest can mock them (dynamic computed-path imports cannot be mocked).
import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import { environment } from '~/src/server/plugins/nunjucks/environment.js'

// Register the markdown filter that the engine plugin normally adds at server init.
environment.addFilter('markdown', (text, startingHeaderLevel) =>
  markdownToHtml(text, { startingHeaderLevel })
)

const COMPONENT_LIST_TEMPLATE = `{% from "partials/components.html" import componentList %}{{ componentList(components) }}`

/**
 * Render a single component fixture to an HTML string.
 * @param {FixtureRender} fixture
 * @returns {string}
 */
export function renderComponent(fixture) {
  // Fixtures use FixtureModel stubs (partial) — FormModel is required by the constructor
  // but components only access the properties each stub provides at render time.
  const model = /** @type {FormModel} */ (
    /** @type {unknown} */ (fixture.model)
  )
  const component = createComponent(fixture.def, { model })
  const viewModel = component.getViewModel({
    payload: fixture.payload,
    errors: [],
    translator: stubTranslator
  })

  // Apply large label/legend sizing to match how QuestionPageController styles
  // a single-component page. isPageHeading is intentionally omitted — setting it
  // causes GOV.UK Frontend to render an <h1>, which breaks heading hierarchy
  // inside the docs page where the preview sits under a <h2>.
  if (viewModel.fieldset?.legend) {
    viewModel.fieldset.legend.classes = 'govuk-fieldset__legend--s'
  } else if (viewModel.label) {
    // classes is a valid GOV.UK Frontend label property, absent from the view model return type
    const label = /** @type {{ text: string; classes?: string }} */ (
      viewModel.label
    )
    label.classes = 'govuk-label--s'
  }

  return environment.renderString(COMPONENT_LIST_TEMPLATE, {
    components: [{ type: fixture.def.type, model: viewModel }]
  })
}

/**
 * Build the MDX partial content from one or more rendered HTML strings.
 * @param {Array<{ label?: string, html: string }>} renders
 * @param {string} [wrapperClass]
 * @returns {string}
 */
export function buildPartialMdx(
  renders,
  wrapperClass = 'component-preview app-no-prose'
) {
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
      return `${labelLine}<div className="${wrapperClass}">\n  <div dangerouslySetInnerHTML={{ __html: \`${escaped}\` }} />\n</div>`
    })
    .join('\n\n')
}

/**
 * Renders all variants for a component and writes the MDX partial to _previews/<slug>.mdx.
 * @param {string} previewsDir - absolute path to the _previews/ directory
 * @param {string} slug - e.g. 'text-field'
 * @param {Fixture} fixture
 */
export function writePreviewPartial(previewsDir, slug, fixture) {
  fs.mkdirSync(previewsDir, { recursive: true })

  const suffixHtml = fixture.previewSuffix
    ? `\n<div class="app-preview-placeholder"><p class="govuk-body govuk-!-margin-bottom-0">${fixture.previewSuffix}</p></div>`
    : ''

  let renders
  if ('variants' in fixture) {
    renders = fixture.variants.map((variant) => ({
      label: variant.label,
      html: renderComponent(variant) + suffixHtml
    }))
  } else {
    renders = [{ html: renderComponent(fixture) + suffixHtml }]
  }

  const content = buildPartialMdx(renders)
  fs.writeFileSync(path.join(previewsDir, `${slug}.mdx`), content)
}

/**
 * @typedef {import('~/src/server/plugins/engine/models/FormModel.js').FormModel} FormModel
 * @typedef {import('./component-preview-fixtures.js').FixtureRender} FixtureRender
 * @typedef {import('./component-preview-fixtures.js').Fixture} Fixture
 */
