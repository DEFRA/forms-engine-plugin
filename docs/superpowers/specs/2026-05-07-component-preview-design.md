# Component Preview in Docs

**Date**: 2026-05-07
**Status**: Approved

## Goal

Add a rendered visual preview of each component to its Docusaurus documentation page, serving as a canonical visual reference for both contributors and consumers of the plugin.

## Decisions

- **Static rendering** — previews are generated at docs build time, not served live. No runtime server required.
- **Single default state** per component (empty payload, no errors), except PaymentField which renders twice (unpaid and paid states).
- **All components get previews** — list-based components (Radios, Checkboxes, Select, Autocomplete) include a bundled sample list in their fixture so `getViewModel()` has what it needs.

## Architecture

One script runs as part of the docs build:

```
npm run generate:docs   # orchestrates both docs and preview generation
```

`generate-component-docs.js` is the orchestrator. It imports and calls exported functions from `generate-component-previews.js` as part of its existing loop over component types — producing the docs content, the preview partial, and the import/`<Preview />` section in a single pass. No post-hoc file amendment.

`generate-component-previews.js` is a pure module: it exports functions and has no top-level side effects. It can also be run standalone if needed.

## Preview Generation Pipeline

### 1. Import the production nunjucks environment

```js
import { environment } from '~/src/server/plugins/nunjucks/environment.js'
```

This gives the script the fully-configured environment: govuk-frontend template paths, all custom filters, and all globals (`checkComponentTemplates`, `evaluate`, `govukRebrand`) already registered. No additional nunjucks configuration needed.

### 2. Load fixture definitions

A new file `scripts/component-preview-fixtures.js` exports a map of component type → fixture object. Each fixture contains:

- `def` — the minimal component definition passed to `createComponent()`
- `model` — a minimal `FormModel` stub (required for list-based components to resolve their named list)

Example:

```js
TextField: {
  def: {
    type: 'TextField',
    name: 'full-name',
    title: 'What is your full name?',
    hint: { text: 'As shown on your passport' },
    options: {},
    schema: {}
  },
  model: null  // not needed for simple fields
}

RadiosField: {
  def: {
    type: 'RadiosField',
    name: 'colour',
    title: 'What is your favourite colour?',
    list: 'colours',
    options: {}
  },
  model: {
    // minimal FormModel stub with the named list
    lists: [{ name: 'colours', type: 'string', items: [
      { text: 'Red', value: 'red' },
      { text: 'Green', value: 'green' },
      { text: 'Blue', value: 'blue' }
    ]}]
  }
}

PaymentField: {
  variants: [
    { label: 'Before payment', def: { ...def }, payload: {} },
    { label: 'After payment',  def: { ...def }, payload: { payment: { preAuth: { status: 'success' } } } }
  ]
}
```

### 3. Instantiate component and call `getViewModel()`

```js
const component = createComponent(fixture.def, { model: fixture.model })
const viewModel = component.getViewModel(payload, [])
```

For PaymentField, this step runs once per variant.

### 4. Render via the `componentList` macro

```js
const html = environment.renderString(
  `{% from "partials/components.html" import componentList %}{{ componentList(components) }}`,
  { components: [viewModel] }
)
```

This is the exact same dispatch path the engine uses at runtime: `componentList` dynamically imports the right template by component type and calls `checkComponentTemplates` before rendering.

### 5. Write MDX partial

Output to `docs/features/components/_previews/<slug>.mdx`.

Standard component (single render):

```mdx
<div className="component-preview">
  <div dangerouslySetInnerHTML={{ __html: `...rendered HTML...` }} />
</div>
```

PaymentField (two renders):

```mdx
<div className="component-preview">
  <p className="preview-label">Before payment</p>
  <div dangerouslySetInnerHTML={{ __html: `...unpaid HTML...` }} />
</div>

<div className="component-preview">
  <p className="preview-label">After payment</p>
  <div dangerouslySetInnerHTML={{ __html: `...paid HTML...` }} />
</div>
```

## Docusaurus Integration

### File structure

```
docs/features/components/
├── index.mdx
├── text-field.mdx               ← extension changed from .md; import + <Preview /> added
├── radios-field.mdx
├── payment-field.mdx
└── _previews/                   ← new directory; ignored by Docusaurus routing (leading _)
    ├── text-field.mdx
    ├── radios-field.mdx
    └── payment-field.mdx
```

### Generated component page structure

```mdx
---
sidebar_label: "Text Field"
sidebar_position: 1
---

import Preview from './_previews/text-field.mdx'

# Text Field

Collects a short single-line text answer...

## Preview

<Preview />

## JSON definition
...
```

### GOV.UK Frontend CSS

Add to the Docusaurus custom CSS file:

```css
@import 'govuk-frontend/dist/govuk/govuk-frontend.min.css';
```

GOV.UK Frontend uses `.govuk-` prefixed classes throughout, so clash risk with Docusaurus's own styles is minimal. A `.component-preview` wrapper provides visual containment (border, background, padding) without requiring CSS scoping.

### npm scripts

```json
"generate:docs": "node scripts/generate-component-docs.js",
"docs":          "npm run generate:docs && docusaurus build"
```

Preview generation is orchestrated from within `generate-component-docs.js`, so no separate script entry is needed.

## New files

| File                                     | Purpose                                                |
| ---------------------------------------- | ------------------------------------------------------ |
| `scripts/generate-component-previews.js` | Renders all component previews and writes MDX partials |
| `scripts/component-preview-fixtures.js`  | Fixture definitions for every component                |

## Modified files

| File                                 | Change                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/generate-component-docs.js` | Output `.mdx` instead of `.md`; import and call preview functions per component; write `<Preview />` section into each generated page |
| `docusaurus.config.cjs`              | Add GOV.UK Frontend CSS import                                                                                                        |

## Out of scope

- Error state previews (only default empty state, except PaymentField)
- Interactive or filled-in state previews
- Live rendering server
- Storybook or other component explorer tools
