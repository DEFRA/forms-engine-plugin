import { ComponentType } from '@defra/forms-model'

import { fixtures as componentFixtures } from './component-preview-fixtures.js'

import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.js'

/**
 * Builds a component view model from the named component fixture so page
 * fixtures can reuse the same data as component previews without duplicating
 * component definitions. Supports variant fixtures — pass a label to select
 * a specific variant, or omit it to use the first (or only) variant.
 * @param {string} name - e.g. 'FileUploadField'
 * @param {string} [variantLabel] - e.g. 'No files uploaded'
 * @returns {{ type: string, model: object }}
 */
function componentViewModel(name, variantLabel) {
  const fixture = componentFixtures[name]
  const variant = fixture.variants
    ? (fixture.variants.find((v) => v.label === variantLabel) ??
      fixture.variants[0])
    : fixture
  const component = createComponent(variant.def, { model: variant.model })
  return {
    type: variant.def.type,
    model: component.getViewModel(variant.payload, [])
  }
}

/** @type {Record<string, { viewName: string, context?: object, variants?: Array<{label: string, context: object}> }>} */
export const pageFixtures = {
  PageController: {
    viewName: 'index',
    variants: [
      {
        label: 'Single question',
        context: {
          showTitle: false,
          page: { allowContinue: true },
          allowSaveAndExit: false,
          get components() {
            const component = componentViewModel('TextField')
            component.model.label.isPageHeading = true
            component.model.label.classes = 'govuk-label--l'
            return [component]
          }
        }
      },
      {
        label: 'Multiple questions',
        context: {
          pageTitle: 'Tell us about yourself',
          showTitle: true,
          page: { allowContinue: true },
          allowSaveAndExit: false,
          get components() {
            return [
              componentViewModel('TextField'),
              componentViewModel('DatePartsField')
            ]
          }
        }
      }
    ]
  },

  StartPageController: {
    viewName: 'index',
    context: {
      pageTitle: 'Apply for a licence',
      showTitle: true,
      isStartPage: true,
      page: { allowContinue: true },
      allowSaveAndExit: false,
      components: []
    }
  },

  TerminalPageController: {
    viewName: 'index',
    context: {
      pageTitle: 'You are not eligible',
      showTitle: true,
      page: { allowContinue: false },
      components: [
        {
          type: ComponentType.Html,
          model: {
            content:
              '<p class="govuk-body">You do not meet the eligibility criteria for this service.</p>'
          }
        }
      ]
    }
  },

  RepeatPageController: {
    viewName: 'repeat-list-summary',
    context: {
      pageTitle: 'Add members of your household',
      showTitle: true,
      allowSaveAndExit: false,
      checkAnswers: [
        {
          summaryList: {
            rows: [
              {
                key: { text: 'Full name' },
                value: { text: 'Sarah Phillips' },
                actions: { items: [{ href: '#', text: 'Remove' }] }
              },
              {
                key: { text: 'Full name' },
                value: { text: 'David Jones' },
                actions: { items: [{ href: '#', text: 'Remove' }] }
              },
              {
                key: { text: 'Full name' },
                value: { text: 'Emma Wilson' },
                actions: { items: [{ href: '#', text: 'Remove' }] }
              }
            ]
          }
        }
      ]
    }
  },

  FileUploadPageController: {
    viewName: 'file-upload',
    exampleComponents: [
      {
        type: 'FileUploadField',
        name: 'upload',
        title: 'Upload a document',
        options: {},
        schema: {}
      }
    ],
    get variants() {
      return [
        {
          label: 'No files uploaded',
          context: {
            pageTitle: 'Upload a document',
            showTitle: true,
            formAction: 'preview',
            page: { allowContinue: true },
            componentsBefore: [],
            components: [
              componentViewModel('FileUploadField', 'No files uploaded')
            ],
            formComponent: componentViewModel(
              'FileUploadField',
              'No files uploaded'
            )
          }
        },
        {
          label: 'With files uploaded',
          context: {
            pageTitle: 'Upload a document',
            showTitle: true,
            formAction: 'preview',
            page: { allowContinue: true },
            componentsBefore: [],
            components: [
              componentViewModel('FileUploadField', 'With files uploaded')
            ],
            formComponent: componentViewModel(
              'FileUploadField',
              'With files uploaded'
            )
          }
        }
      ]
    }
  },

  SummaryPageController: {
    viewName: 'summary',
    context: {
      pageTitle: 'Check your answers',
      allowSaveAndExit: false,
      checkAnswers: [
        {
          summaryList: {
            rows: [
              {
                key: { text: 'Full name' },
                value: { text: 'Sarah Phillips' },
                actions: {
                  items: [
                    {
                      href: '#',
                      text: 'Change',
                      visuallyHiddenText: 'full name'
                    }
                  ]
                }
              },
              {
                key: { text: 'Email address' },
                value: { text: 'sarah@example.gov.uk' },
                actions: {
                  items: [
                    {
                      href: '#',
                      text: 'Change',
                      visuallyHiddenText: 'email address'
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  }
}
