# Component Preview in Docs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rendered GOV.UK Frontend preview of each plugin component to its Docusaurus docs page, generated at build time using the production nunjucks environment.

**Architecture:** `generate-component-previews.js` exports pure functions for rendering and MDX generation. `generate-component-docs.js` imports and calls these functions during its existing component loop, writing `_previews/<slug>.mdx` partials and inserting an `import` + `<Preview />` section into each generated component page. Rendering uses the production nunjucks environment from `.server/` (built output) via the `componentList` macro — the same dispatch path used at runtime.

**Tech Stack:** Node.js ESM, nunjucks, `@defra/forms-model`, govuk-frontend, Docusaurus MDX, Jest

---

## File Map

| File                                          | Status | Responsibility                                         |
| --------------------------------------------- | ------ | ------------------------------------------------------ |
| `scripts/component-preview-fixtures.js`       | Create | Static fixture data for every component                |
| `scripts/generate-component-previews.js`      | Create | Rendering functions + MDX string builders              |
| `scripts/generate-component-previews.test.js` | Create | Unit tests for pure functions                          |
| `scripts/generate-component-docs.js`          | Modify | Orchestrator — call preview functions, output `.mdx`   |
| `scripts/generate-component-docs.test.js`     | Modify | Add tests for modified `generateComponentMd` signature |
| `docs/assets/css/docusaurus.scss`             | Modify | Add govuk-frontend CSS import                          |

---

### Task 1: Create `scripts/component-preview-fixtures.js`

**Files:**

- Create: `scripts/component-preview-fixtures.js`
- Test: `scripts/generate-component-previews.test.js` (partial — fixture shape assertions)

- [ ] **Step 1: Write fixture shape test**

Create `scripts/generate-component-previews.test.js`:

```js
// @ts-nocheck

import { fixtures } from './component-preview-fixtures.js'

describe('component-preview-fixtures', () => {
  it('every fixture has a def with type, name, and title', () => {
    for (const [key, fixture] of Object.entries(fixtures)) {
      if (fixture.variants) {
        for (const variant of fixture.variants) {
          expect(variant.def.type).toBeDefined()
          expect(variant.def.name).toBeDefined()
          expect(variant.label).toBeDefined()
        }
      } else {
        expect(fixture.def.type).toBe(key)
        expect(fixture.def.name).toBeDefined()
        expect(fixture.def.title).toBeDefined()
      }
    }
  })

  it('list-based fixtures have a model with getList function', () => {
    const listTypes = ['RadiosField', 'CheckboxesField', 'SelectField', 'AutocompleteField']
    for (const type of listTypes) {
      expect(fixtures[type]).toBeDefined()
      expect(typeof fixtures[type].model?.getList).toBe('function')
    }
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest scripts/generate-component-previews.test.js --no-coverage
```

Expected: FAIL with `Cannot find module './component-preview-fixtures.js'`

- [ ] **Step 3: Create `scripts/component-preview-fixtures.js`**

```js
// Fixture definitions for component preview generation.
// Each fixture provides the minimal data needed to call createComponent() and getViewModel().
// List-based components include a model stub with getList() so the constructor can resolve items.
// PaymentField uses variants to show unpaid and paid states.

const sampleList = {
  getList: () => ({
    name: 'options',
    type: 'string',
    items: [
      { text: 'Option 1', value: 'option-1' },
      { text: 'Option 2', value: 'option-2' },
      { text: 'Option 3', value: 'option-3' }
    ]
  })
}

export const fixtures = {
  TextField: {
    def: { type: 'TextField', name: 'full-name', title: 'What is your full name?', hint: { text: 'As shown on your passport' }, options: {}, schema: {} },
    model: null,
    payload: {}
  },
  EmailAddressField: {
    def: { type: 'EmailAddressField', name: 'email', title: 'What is your email address?', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  MultilineTextField: {
    def: { type: 'MultilineTextField', name: 'description', title: 'Describe your issue', hint: { text: 'Include as much detail as you can' }, options: { rows: 5 }, schema: {} },
    model: null,
    payload: {}
  },
  NumberField: {
    def: { type: 'NumberField', name: 'age', title: 'What is your age?', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  TelephoneNumberField: {
    def: { type: 'TelephoneNumberField', name: 'phone', title: 'What is your telephone number?', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  MonthYearField: {
    def: { type: 'MonthYearField', name: 'start-date', title: 'When did this start?', hint: { text: 'For example, 3 2025' }, options: {}, schema: {} },
    model: null,
    payload: {}
  },
  DatePartsField: {
    def: { type: 'DatePartsField', name: 'dob', title: 'What is your date of birth?', hint: { text: 'For example, 27 3 2007' }, options: {}, schema: {} },
    model: null,
    payload: {}
  },
  UkAddressField: {
    def: { type: 'UkAddressField', name: 'address', title: 'What is your address?', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  YesNoField: {
    def: { type: 'YesNoField', name: 'agree', title: 'Do you agree?', options: {} },
    model: sampleList,
    payload: {}
  },
  RadiosField: {
    def: { type: 'RadiosField', name: 'colour', title: 'What is your favourite colour?', list: 'options', options: {} },
    model: sampleList,
    payload: {}
  },
  CheckboxesField: {
    def: { type: 'CheckboxesField', name: 'colours', title: 'Which colours do you like?', list: 'options', options: {} },
    model: sampleList,
    payload: {}
  },
  SelectField: {
    def: { type: 'SelectField', name: 'country', title: 'Select a country', list: 'options', options: {} },
    model: sampleList,
    payload: {}
  },
  AutocompleteField: {
    def: { type: 'AutocompleteField', name: 'country', title: 'Select a country', list: 'options', options: {} },
    model: sampleList,
    payload: {}
  },
  DeclarationField: {
    def: { type: 'DeclarationField', name: 'declaration', title: 'Declaration', content: 'I confirm that the information I have provided is correct.', options: {} },
    model: null,
    payload: {}
  },
  FileUploadField: {
    def: { type: 'FileUploadField', name: 'upload', title: 'Upload a document', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  Html: {
    def: { type: 'Html', name: 'info', content: '<p>This is an <strong>HTML</strong> content component.</p>', options: {} },
    model: null,
    payload: {}
  },
  InsetText: {
    def: { type: 'InsetText', name: 'notice', content: 'You can only apply once every 12 months.', options: {} },
    model: null,
    payload: {}
  },
  Details: {
    def: { type: 'Details', name: 'help', title: 'Help with this question', content: 'This information is needed to process your application.', options: {} },
    model: null,
    payload: {}
  },
  Markdown: {
    def: { type: 'Markdown', name: 'guidance', content: '## Guidance\n\nPlease read this carefully before continuing.', options: {} },
    model: null,
    payload: {}
  },
  List: {
    def: { type: 'List', name: 'steps', title: 'What you need to do', content: '- Step one\n- Step two\n- Step three', options: {} },
    model: null,
    payload: {}
  },
  HiddenField: {
    def: { type: 'HiddenField', name: 'ref', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  LatLongField: {
    def: { type: 'LatLongField', name: 'location', title: 'Enter a latitude and longitude', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  EastingNorthingField: {
    def: { type: 'EastingNorthingField', name: 'location', title: 'Enter an easting and northing', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  OsGridRefField: {
    def: { type: 'OsGridRefField', name: 'location', title: 'Enter an OS grid reference', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  NationalGridFieldNumberField: {
    def: { type: 'NationalGridFieldNumberField', name: 'location', title: 'Enter a national grid reference', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  GeospatialField: {
    def: { type: 'GeospatialField', name: 'location', title: 'Enter a location', options: {}, schema: {} },
    model: null,
    payload: {}
  },
  PaymentField: {
    variants: [
      {
        label: 'Before payment',
        def: { type: 'PaymentField', name: 'payment', title: 'Pay for your application', options: { amount: 2300, description: 'Application fee' } },
        model: null,
        payload: {}
      },
      {
        label: 'After payment',
        def: { type: 'PaymentField', name: 'payment', title: 'Pay for your application', options: { amount: 2300, description: 'Application fee' } },
        model: null,
        payload: {
          payment: {
            paymentId: 'pi_example123',
            amount: 2300,
            description: 'Application fee',
            preAuth: { status: 'success' },
            state: { status: 'success', finished: true }
          }
        }
      }
    ]
  }
}
```

- [ ] **Step 4: Run the fixture shape test**

```bash
npx jest scripts/generate-component-previews.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/component-preview-fixtures.js scripts/generate-component-previews.test.js
git commit -m "feat: add component preview fixture definitions"
```

---

### Task 2: Pure functions in `generate-component-previews.js`

**Files:**

- Create: `scripts/generate-component-previews.js`
- Modify: `scripts/generate-component-previews.test.js`

- [ ] **Step 1: Add tests for pure functions**

Append to `scripts/generate-component-previews.test.js`:

```js
import { jest } from '@jest/globals'

// These paths match the static imports in generate-component-previews.js,
// resolved relative to this test file (both in scripts/).
jest.mock('../.server/server/plugins/nunjucks/environment.js', () => ({
  environment: { renderString: jest.fn().mockReturnValue('<div class="govuk-form-group"></div>') }
}))

jest.mock('../.server/server/plugins/engine/components/helpers/components.js', () => ({
  createComponent: jest.fn().mockReturnValue({
    getViewModel: jest.fn().mockReturnValue({
      type: 'TextField',
      isFormComponent: true,
      model: { label: { text: 'Question' }, name: 'field', id: 'field' }
    })
  })
}))

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}))

import { buildPartialMdx } from './generate-component-previews.js'

describe('buildPartialMdx', () => {
  it('wraps a single render in a component-preview div', () => {
    const result = buildPartialMdx([{ html: '<input class="govuk-input">' }])
    expect(result).toContain('className="component-preview"')
    expect(result).toContain('dangerouslySetInnerHTML')
    expect(result).toContain('govuk-input')
  })

  it('renders two blocks with labels for multi-variant components', () => {
    const result = buildPartialMdx([
      { label: 'Before payment', html: '<div>unpaid</div>' },
      { label: 'After payment', html: '<div>paid</div>' }
    ])
    expect(result).toContain('Before payment')
    expect(result).toContain('After payment')
    const matches = result.match(/className="component-preview"/g)
    expect(matches).toHaveLength(2)
  })

  it('escapes backticks and dollar-brace sequences in HTML', () => {
    const result = buildPartialMdx([{ html: 'a `backtick` and ${expr}' }])
    expect(result).toContain('\\`backtick\\`')
    expect(result).toContain('\\${expr}')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest scripts/generate-component-previews.test.js --no-coverage
```

Expected: FAIL with `Cannot find module './generate-component-previews.js'`

- [ ] **Step 3: Create `scripts/generate-component-previews.js`**

```js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Static imports so Jest can mock them (dynamic computed-path imports cannot be mocked).
// Requires `npm run build` to have produced `.server/` before running this script.
import { environment } from '../.server/server/plugins/nunjucks/environment.js'
import { createComponent } from '../.server/server/plugins/engine/components/helpers/components.js'

const COMPONENT_LIST_TEMPLATE =
  `{% from "partials/components.html" import componentList %}{{ componentList(components) }}`

/**
 * Render a single component fixture to an HTML string.
 * @param {{ def: object, model: object|null, payload: object }} fixture
 * @returns {string}
 */
export function renderComponent(fixture) {
  const component = createComponent(fixture.def, { model: fixture.model })
  const viewModel = component.getViewModel(fixture.payload, [])
  return environment.renderString(COMPONENT_LIST_TEMPLATE, { components: [viewModel] })
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
      const labelLine = label
        ? `  <p className="component-preview__label">${label}</p>\n`
        : ''
      return `<div className="component-preview">\n${labelLine}  <div dangerouslySetInnerHTML={{ __html: \`${escaped}\` }} />\n</div>`
    })
    .join('\n\n')
}

/**
 * Renders all variants for a component and writes the MDX partial to _previews/<slug>.mdx.
 * @param {string} previewsDir - absolute path to the _previews/ directory
 * @param {string} slug - e.g. 'text-field'
 * @param {string} componentType - e.g. 'TextField'
 * @param {object} fixture - from component-preview-fixtures.js
 */
export function writePreviewPartial(previewsDir, slug, componentType, fixture) {
  fs.mkdirSync(previewsDir, { recursive: true })

  let renders
  if (fixture.variants) {
    renders = fixture.variants.map((variant) => ({
      label: variant.label,
      html: renderComponent(variant)
    }))
  } else {
    renders = [{ html: renderComponent(fixture) }]
  }

  const content = buildPartialMdx(renders)
  fs.writeFileSync(path.join(previewsDir, `${slug}.mdx`), content)
}
```

- [ ] **Step 4: Run the pure function tests**

```bash
npx jest scripts/generate-component-previews.test.js --no-coverage
```

Expected: PASS for `buildPartialMdx` and `getPreviewAdditions`. The fixture shape tests from Task 1 also pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-component-previews.js scripts/generate-component-previews.test.js
git commit -m "feat: add preview rendering and MDX generation functions"
```

---

### Task 3: Wire preview generation into `generate-component-docs.js`

**Files:**

- Modify: `scripts/generate-component-docs.js`
- Modify: `scripts/generate-component-docs.test.js`

The changes are:

1. Import `getPreviewAdditions` and `writePreviewPartial` from the new script
2. Import `fixtures` from `component-preview-fixtures.js`
3. Add `slug` parameter to `generateComponentMd` — insert the import line after frontmatter and the Preview section before `## JSON definition`
4. Change the output extension from `.md` to `.mdx`
5. Call `writePreviewPartial()` in the component loop

- [ ] **Step 1: Add a mock for `generate-component-previews.js` to the test file**

`generate-component-docs.js` will import `writePreviewPartial` from `generate-component-previews.js`, which has transitive `.server/` imports. Without a mock, loading the docs generator in Jest would fail if `.server/` doesn't exist.

Open `scripts/generate-component-docs.test.js` and add this mock alongside the existing `jest.mock('typescript', ...)` and `jest.mock('fs', ...)` calls:

```js
jest.mock('./generate-component-previews.js', () => ({
  writePreviewPartial: jest.fn()
}))
```

> **Note:** `generateComponentMd` is currently not exported from `generate-component-docs.js`. The next step exports it so it can be unit tested.

- [ ] **Step 2: Export `generateComponentMd` from `generate-component-docs.js`**

Find the line in `generate-component-docs.js`:

```js
function generateComponentMd(componentName, interfaceData, sidebarPosition) {
```

Change to:

```js
export function generateComponentMd(componentName, interfaceData, sidebarPosition, slug = null) {
```

- [ ] **Step 3: Update `generateComponentMd` to insert the import and Preview section**

Inside `generateComponentMd`, locate the existing lines array construction:

```js
  const lines = [
    `---`,
    `sidebar_label: "${label}"`,
    `sidebar_position: ${sidebarPosition}`,
    `---`,
    ``,
    `# ${label}`,
```

Replace with (adds import line after frontmatter when `slug` is provided):

```js
  const previewImport = slug ? [``, `import Preview from './_previews/${slug}.mdx'`] : []

  const lines = [
    `---`,
    `sidebar_label: "${label}"`,
    `sidebar_position: ${sidebarPosition}`,
    `---`,
    ...previewImport,
    ``,
    `# ${label}`,
```

Then locate the line that pushes `## JSON definition`:

```js
  lines.push(
    `## JSON definition`,
```

Insert the Preview section before it (only when slug is provided):

```js
  if (slug) {
    lines.push(`## Preview`, ``, `<Preview />`, ``)
  }

  lines.push(
    `## JSON definition`,
```

- [ ] **Step 4: Replace the placeholder test with a real assertion**

Back in `generate-component-docs.test.js`, add `generateComponentMd` to the existing import:

```js
import {
  controllerLabel,
  controllerSlug,
  deriveCategory,
  generateComponentMd,   // add this
  generateExample,
  generatePageExample,
  placeholderForType,
  setNestedValue,
  simplifyType,
  toKebabCase,
  toLabel
} from './generate-component-docs.js'
```

Replace the placeholder test:

```js
describe('generateComponentMd with preview', () => {
  const interfaceData = { options: [], schema: [], props: [] }

  it('includes preview import when slug is provided', () => {
    const result = generateComponentMd('TextField', interfaceData, 1, 'text-field')
    expect(result).toContain("import Preview from './_previews/text-field.mdx'")
    expect(result).toContain('## Preview')
    expect(result).toContain('<Preview />')
  })

  it('omits preview section when no slug is provided', () => {
    const result = generateComponentMd('TextField', interfaceData, 1)
    expect(result).not.toContain('import Preview')
    expect(result).not.toContain('## Preview')
  })
})
```

- [ ] **Step 5: Run the tests**

```bash
npx jest scripts/generate-component-docs.test.js --no-coverage
```

Expected: PASS (all existing tests plus the new ones)

- [ ] **Step 6: Add imports and wire the preview calls into `main()`**

At the top of `generate-component-docs.js`, add:

```js
import { fixtures } from './component-preview-fixtures.js'
import { getPreviewAdditions, writePreviewPartial } from './generate-component-previews.js'
```

In the `main()` function, locate the `componentsOutputDir` setup and add the previews directory constant below it:

```js
const componentsOutputDir = path.resolve(__dirname, '../docs/features/components')
const previewsOutputDir = path.resolve(componentsOutputDir, '_previews')  // add this
```

In the component loop, change from:

```js
    const slug = toKebabCase(name)
    const content = generateComponentMd(name, interfaceData, i + 1)
    fs.writeFileSync(path.join(componentsOutputDir, `${slug}.md`), content)
```

To:

```js
    const slug = toKebabCase(name)
    const content = generateComponentMd(name, interfaceData, i + 1, slug)
    fs.writeFileSync(path.join(componentsOutputDir, `${slug}.mdx`), content)

    const fixture = fixtures[name]
    if (fixture) {
      writePreviewPartial(previewsOutputDir, slug, name, fixture)
    } else {
      console.warn(`Warning: no preview fixture for ${name}`)
    }
```

Also change the index file extension (find the index writeFileSync call):

```js
  fs.writeFileSync(
    path.join(componentsOutputDir, 'index.md'),
```

Change to:

```js
  fs.writeFileSync(
    path.join(componentsOutputDir, 'index.mdx'),
```

- [ ] **Step 7: Run all generate-component-docs tests**

```bash
npx jest scripts/generate-component-docs.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add scripts/generate-component-docs.js scripts/generate-component-docs.test.js
git commit -m "feat: wire component preview generation into docs orchestrator"
```

---

### Task 4: Add GOV.UK Frontend CSS to Docusaurus

**Files:**

- Modify: `docs/assets/css/docusaurus.scss`

The Docusaurus config already loads `docs/assets/css/docusaurus.scss` via the `customCssPlugin`. Add the govuk-frontend stylesheet and a scoped `.component-preview` style.

- [ ] **Step 1: Add the import to `docs/assets/css/docusaurus.scss`**

Open `docs/assets/css/docusaurus.scss` and prepend:

```scss
@import 'govuk-frontend/dist/govuk/govuk-frontend.min.css';
```

Then append the preview wrapper style:

```scss
.component-preview {
  border: 1px solid #b1b4b6;
  border-radius: 4px;
  padding: 24px 28px;
  margin-bottom: 16px;
  background: #fff;
}

.component-preview__label {
  font-size: 12px;
  font-weight: 600;
  color: #505a5f;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 16px;
}
```

- [ ] **Step 2: Commit**

```bash
git add docs/assets/css/docusaurus.scss
git commit -m "feat: add govuk-frontend CSS and component preview styles to Docusaurus"
```

---

### Task 5: End-to-end verification

- [ ] **Step 1: Ensure the server is built**

```bash
npm run build
```

Expected: exits 0, `.server/` directory is populated including `.server/server/plugins/nunjucks/environment.js`

- [ ] **Step 2: Run the docs generation script**

```bash
node scripts/generate-component-docs.js
```

Expected: output similar to `Generated 25 component pages and N page type pages.` with no `Warning: no preview fixture` messages (or only for any components not yet in the fixture file). Check that `docs/features/components/` contains `.mdx` files and a `_previews/` subdirectory.

```bash
ls docs/features/components/
ls docs/features/components/_previews/
```

Expected: `.mdx` files for each component, matching `.mdx` partials in `_previews/`.

- [ ] **Step 3: Spot-check a generated file**

```bash
head -20 docs/features/components/text-field.mdx
```

Expected output:

```mdx
---
sidebar_label: "Text Field"
sidebar_position: 1
---

import Preview from './_previews/text-field.mdx'

# Text Field
...
## Preview

<Preview />

## JSON definition
```

- [ ] **Step 4: Spot-check a preview partial**

```bash
cat docs/features/components/_previews/text-field.mdx
```

Expected: a `<div className="component-preview">` block containing `dangerouslySetInnerHTML` with `govuk-input` in the HTML string.

- [ ] **Step 5: Spot-check the PaymentField partial (two blocks)**

```bash
cat docs/features/components/_previews/payment-field.mdx
```

Expected: two `<div className="component-preview">` blocks, the first containing `Before payment`, the second `After payment` and `You have already authorised a payment`.

- [ ] **Step 6: Build the Docusaurus site**

```bash
npm run docs:build
```

Expected: build succeeds with no MDX parse errors. If there are errors like `Unexpected token` in an MDX partial, the HTML contains unescaped `{` or `}` characters — go back to `buildPartialMdx` and add escaping for `{` → `\{`.

- [ ] **Step 7: Serve and visually verify**

```bash
npm run docs:serve
```

Open `http://localhost:3000/features/components/text-field` in a browser. Confirm:

- The Preview section appears between the description and JSON definition
- The GOV.UK input renders with correct styling (blue focus ring, border, label)
- No unstyled or broken HTML visible

Open `http://localhost:3000/features/components/payment-field`. Confirm both payment states are visible with labels.

Open `http://localhost:3000/features/components/radios-field`. Confirm radio buttons with Option 1, Option 2, Option 3 are visible.

- [ ] **Step 8: Commit final state**

```bash
git add docs/features/components/
git commit -m "feat: regenerate component docs with rendered previews"
```

---

## Notes for implementers

**`writePreviewPartial` uses dynamic imports** (`await import(...)`) because the `.server/` paths are runtime-resolved. This is standard Node.js ESM — no special handling needed.

**If a fixture causes `createComponent` to throw** (e.g. a required option is missing), the error will include the component type name. Check the component's Joi schema in `src/server/plugins/engine/components/<ComponentType>.ts` to find what `options` fields are required.

**If the Docusaurus build fails with MDX parse errors**, the rendered HTML likely contains `{` or `}` characters (common in GOV.UK Frontend's conditional reveal HTML). Add escaping in `buildPartialMdx`:

```js
const escaped = html
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${')
  .replace(/\{/g, '&#123;')
  .replace(/\}/g, '&#125;')
```

**The `docs:build:all` npm script** currently does not run `npm run build` first. Either run `npm run build && npm run docs:build:all`, or update the script:

```json
"docs:build:all": "npm run build && node scripts/generate-schema-docs.js && node scripts/generate-component-docs.js && npm run docs:build"
```
