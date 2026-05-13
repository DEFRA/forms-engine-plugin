import { ComponentType } from '@defra/forms-model'

import { fixtures as componentFixtures } from './component-preview-fixtures.js'

import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.js'

/**
 * Derives a GOV.UK Frontend view model from the canonical component fixture.
 * Handles both flat fixtures (def/model/payload at top level) and variant
 * fixtures (variants array). When variantLabel is provided, finds the matching
 * variant; otherwise uses the first variant (or the flat fixture itself).
 * @param {string} name - Component fixture key, e.g. 'TextField'
 * @param {string} [variantLabel] - Variant label, e.g. 'No files uploaded'
 * @returns {object}
 */
function componentViewModel(name, variantLabel) {
  const fixture = componentFixtures[name]
  const variant = fixture.variants
    ? (fixture.variants.find((v) => v.label === variantLabel) ??
      fixture.variants[0])
    : fixture
  const component = createComponent(variant.def, { model: variant.model })
  return component.getViewModel(variant.payload, [])
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
            const model = componentViewModel('TextField')
            model.label.isPageHeading = true
            model.label.classes = 'govuk-label--l'
            return [{ type: ComponentType.TextField, model }]
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
              {
                type: ComponentType.TextField,
                model: componentViewModel('TextField')
              },
              {
                type: ComponentType.DatePartsField,
                model: componentViewModel('DatePartsField')
              }
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
    variants: [
      {
        label: 'No items',
        context: {
          pageTitle: 'People',
          showTitle: true,
          checkAnswers: [],
          allowSaveAndExit: false
        }
      },
      {
        label: 'One item',
        context: {
          pageTitle: 'People',
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
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  },

  FileUploadPageController: {
    viewName: 'file-upload',
    get variants() {
      return [
        {
          label: 'No files uploaded',
          context: {
            pageTitle: 'Upload a document',
            showTitle: true,
            formAction: 'preview',
            componentsBefore: [],
            components: [
              {
                type: ComponentType.FileUploadField,
                model: componentViewModel(
                  'FileUploadField',
                  'No files uploaded'
                )
              }
            ],
            formComponent: {
              type: ComponentType.FileUploadField,
              model: componentViewModel('FileUploadField', 'No files uploaded')
            }
          }
        },
        {
          label: 'With files uploaded',
          context: {
            pageTitle: 'Upload a document',
            showTitle: true,
            formAction: 'preview',
            componentsBefore: [],
            components: [
              {
                type: ComponentType.FileUploadField,
                model: componentViewModel(
                  'FileUploadField',
                  'With files uploaded'
                )
              }
            ],
            formComponent: {
              type: ComponentType.FileUploadField,
              model: componentViewModel(
                'FileUploadField',
                'With files uploaded'
              )
            }
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
