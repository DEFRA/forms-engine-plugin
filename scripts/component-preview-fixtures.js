// Fixture definitions for component preview generation.
// Each fixture provides the minimal data needed to call createComponent() and getViewModel().
// List-based components include a model stub with getList() so the constructor can resolve items.
// PaymentField uses variants to show unpaid and paid states.

import { ComponentType, getYesNoList, yesNoListId } from '@defra/forms-model'

const yesNoModel = {
  getList: (/** @type {string} */ id) =>
    id === yesNoListId ? getYesNoList() : undefined
}

const sampleList = {
  getList: () => ({
    name: 'options',
    title: 'Options',
    type: /** @type {'string'} */ ('string'),
    items: [
      { text: 'Option 1', value: 'option-1' },
      { text: 'Option 2', value: 'option-2' },
      { text: 'Option 3', value: 'option-3' }
    ]
  })
}

/** @type {Partial<Record<ComponentType, Fixture>>} */
export const fixtures = {
  [ComponentType.TextField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.TextField,
      name: 'full-name',
      title: 'What is your full name?',
      hint: 'As shown on your passport',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.EmailAddressField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.EmailAddressField,
      name: 'email',
      title: 'What is your email address?',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.MultilineTextField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.MultilineTextField,
      name: 'description',
      title: 'Describe your issue',
      hint: 'Include as much detail as you can',
      options: { rows: 5 },
      schema: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.NumberField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.NumberField,
      name: 'age',
      title: 'What is your age?',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.TelephoneNumberField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.TelephoneNumberField,
      name: 'phone',
      title: 'What is your telephone number?',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.MonthYearField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.MonthYearField,
      name: 'start-date',
      title: 'When did this start?',
      hint: 'For example, 3 2025',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.DatePartsField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.DatePartsField,
      name: 'dob',
      title: 'What is your date of birth?',
      hint: 'For example, 27 3 2007',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.UkAddressField]: {
    jsLevel: 3,
    variants: [
      {
        label: 'With postcode lookup',
        def: {
          type: ComponentType.UkAddressField,
          name: 'address',
          title: 'What is your address?',
          options: { usePostcodeLookup: true }
        },
        model: { ordnanceSurveyApiKey: 'preview' },
        payload: {}
      },
      {
        label: 'Without postcode lookup',
        def: {
          type: ComponentType.UkAddressField,
          name: 'address',
          title: 'What is your address?',
          options: {}
        },
        model: null,
        payload: {}
      }
    ]
  },
  [ComponentType.YesNoField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.YesNoField,
      name: 'agree',
      title: 'Do you agree?',
      options: {}
    },
    model: yesNoModel,
    payload: {}
  },
  [ComponentType.RadiosField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.RadiosField,
      name: 'colour',
      title: 'What is your favourite colour?',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  [ComponentType.CheckboxesField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.CheckboxesField,
      name: 'colours',
      title: 'Which colours do you like?',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  [ComponentType.SelectField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.SelectField,
      name: 'country',
      title: 'Select a country',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  [ComponentType.AutocompleteField]: {
    jsLevel: 2,
    jsNotice:
      'This component is progressively enhanced. Without JavaScript it renders as a standard &lt;select&gt; dropdown that works fully. With JavaScript enabled it becomes a searchable autocomplete.',
    def: {
      type: ComponentType.AutocompleteField,
      name: 'country',
      title: 'Select a country',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  [ComponentType.DeclarationField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.DeclarationField,
      name: 'declaration',
      title: 'Declaration',
      content: 'I confirm that the information I have provided is correct.',
      options: {}
    },
    model: null,
    payload: {}
  },
  // FileUploadField acts as a file manager for files already in session state.
  // Actual uploading is handled by CDP via FileUploadPageController.
  [ComponentType.FileUploadField]: {
    jsLevel: 2,
    jsNotice:
      'This component is progressively enhanced. File uploads work without JavaScript using standard form submission. With JavaScript enabled, users get real-time upload progress.',
    variants: [
      {
        label: 'No files uploaded',
        def: {
          type: ComponentType.FileUploadField,
          name: 'upload',
          title: 'Upload a document',
          options: {},
          schema: {}
        },
        model: null,
        payload: {}
      },
      {
        label: 'With files uploaded',
        def: {
          type: ComponentType.FileUploadField,
          name: 'upload',
          title: 'Upload a document',
          options: {},
          schema: {}
        },
        model: null,
        payload: {
          upload:
            /** @type {import('~/src/server/plugins/engine/types.js').UploadState} */ ([
              {
                uploadId: '00000000-0000-0000-0000-000000000001',
                status: {
                  uploadStatus: 'ready',
                  metadata: { retrievalKey: 'preview-key' },
                  form: {
                    file: {
                      fileId: '00000000-0000-0000-0000-000000000002',
                      filename: 'annual-report.pdf',
                      contentLength: 204800,
                      fileStatus: 'complete'
                    }
                  },
                  numberOfRejectedFiles: 0
                }
              },
              {
                uploadId: '00000000-0000-0000-0000-000000000003',
                status: {
                  uploadStatus: 'ready',
                  metadata: { retrievalKey: 'preview-key' },
                  form: {
                    file: {
                      fileId: '00000000-0000-0000-0000-000000000004',
                      filename: 'supporting-evidence.docx',
                      contentLength: 98304,
                      fileStatus: 'complete'
                    }
                  },
                  numberOfRejectedFiles: 0
                }
              }
            ])
        }
      }
    ]
  },
  [ComponentType.Html]: {
    jsLevel: 3,
    def: {
      type: ComponentType.Html,
      name: 'info',
      title: 'HTML content',
      content: '<p>This is an <strong>HTML</strong> content component.</p>',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.InsetText]: {
    jsLevel: 3,
    def: {
      type: ComponentType.InsetText,
      name: 'notice',
      title: 'Important notice',
      content: 'You can only apply once every 12 months.',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.Details]: {
    jsLevel: 3,
    def: {
      type: ComponentType.Details,
      name: 'help',
      title: 'Help with this question',
      content: 'This information is needed to process your application.',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.Markdown]: {
    jsLevel: 3,
    def: {
      type: ComponentType.Markdown,
      name: 'guidance',
      title: 'Guidance',
      content: '## Guidance\n\nPlease read this carefully before continuing.',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.List]: {
    jsLevel: 3,
    def: {
      type: ComponentType.List,
      name: 'steps',
      title: 'What you need to do',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  [ComponentType.HiddenField]: {
    jsLevel: 3,
    def: {
      type: ComponentType.HiddenField,
      name: 'ref',
      title: 'Hidden reference',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.LatLongField]: {
    jsLevel: 2,
    jsNotice:
      'This component is progressively enhanced. The coordinate fields work without JavaScript. With JavaScript enabled, an interactive map lets users click to set their location.',
    previewSuffix: 'Map appears here with JavaScript enabled',
    def: {
      type: ComponentType.LatLongField,
      name: 'location',
      title: 'Enter a latitude and longitude',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.EastingNorthingField]: {
    jsLevel: 2,
    jsNotice:
      'This component is progressively enhanced. The coordinate fields work without JavaScript. With JavaScript enabled, an interactive map lets users click to set their location.',
    previewSuffix: 'Map appears here with JavaScript enabled',
    def: {
      type: ComponentType.EastingNorthingField,
      name: 'location',
      title: 'Enter an easting and northing',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.OsGridRefField]: {
    jsLevel: 2,
    jsNotice:
      'This component is progressively enhanced. The OS grid reference field works without JavaScript. With JavaScript enabled, an interactive map lets users click to set their location.',
    previewSuffix: 'Map appears here with JavaScript enabled',
    def: {
      type: ComponentType.OsGridRefField,
      name: 'location',
      title: 'Enter an OS grid reference',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.NationalGridFieldNumberField]: {
    jsLevel: 2,
    jsNotice:
      'This component is progressively enhanced. The national grid reference field works without JavaScript. With JavaScript enabled, an interactive map lets users click to set their location.',
    previewSuffix: 'Map appears here with JavaScript enabled',
    def: {
      type: ComponentType.NationalGridFieldNumberField,
      name: 'location',
      title: 'Enter a national grid reference',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.GeospatialField]: {
    jsLevel: 1,
    jsNotice: [
      'A multiline text input that accepts raw GeoJSON is available as a fallback when JavaScript is unavailable, but this is not a recommended user journey. This component has a hard client-side JavaScript requirement. If JavaScript availability is a concern, use a progressively enhanced component instead.',
      'We recommend using the <a className="govuk-link" href="https://submit-form-to-defra.service.gov.uk/form/preview/draft/geospatial-pattern/site-information">map question pattern</a> when asking users to select or draw locations on a map. This pattern provides alternatives so users who cannot use maps are not excluded.'
    ],
    def: {
      type: ComponentType.GeospatialField,
      name: 'location',
      title: 'Enter a location',
      options: {}
    },
    model: null,
    payload: {}
  },
  [ComponentType.PaymentField]: {
    jsLevel: 3,
    variants: [
      {
        label: 'Before payment',
        def: {
          type: ComponentType.PaymentField,
          name: 'payment',
          title: 'Pay for your application',
          options: { amount: 2300, description: 'Application fee' }
        },
        model: null,
        payload: {}
      },
      {
        label: 'After payment',
        def: {
          type: ComponentType.PaymentField,
          name: 'payment',
          title: 'Pay for your application',
          options: { amount: 2300, description: 'Application fee' }
        },
        model: null,
        // PaymentState is not in FormValue, so this object can't be directly assigned to FormPayload
        payload: /** @type {FormPayload} */ (
          /** @type {unknown} */ ({
            payment: {
              paymentId: 'pi_example123',
              reference: 'REF-001',
              amount: 2300,
              description: 'Application fee',
              uuid: '00000000-0000-0000-0000-000000000001',
              formId: 'example-form',
              isLivePayment: false,
              preAuth: {
                status: 'success',
                createdAt: '2025-01-01T00:00:00.000Z'
              }
            }
          })
        )
      }
    ]
  }
}

/**
 * @typedef {import('@defra/forms-model').ComponentDef} ComponentDef
 * @typedef {import('~/src/server/plugins/engine/models/FormModel.js').FormModel} FormModel
 * @typedef {import('~/src/server/plugins/engine/types.js').FormPayload} FormPayload
 * @typedef {{ def: ComponentDef, model: Partial<FormModel>|null, payload: FormPayload }} FixtureRender
 * @typedef {{ label: string } & FixtureRender} FixtureVariant
 * @typedef {{ jsLevel: 1|2|3, jsNotice?: string | string[], previewSuffix?: string } & (FixtureRender | { variants: FixtureVariant[] })} Fixture
 *
 * jsLevel describes the component's JavaScript dependency:
 *   1 — hard JS requirement, cannot be statically rendered (e.g. map). Docs show a jsNotice only.
 *   2 — progressively enhanced, works without JS but degrades. Docs show a jsNotice + static preview.
 *   3 — no meaningful JS dependency beyond what GOV.UK Frontend already provides. Docs show a static preview only.
 *
 * jsNotice — HTML/JSX string or array of strings explaining the JS dependency (required for levels 1
 *   and 2). Each string is wrapped in a <p className="govuk-body">. Use <a className="govuk-link">
 *   for links. previewSuffix is plain text (markdown context).
 *
 * previewSuffix — optional text appended below the static preview as a placeholder, used to
 *   indicate where a JS-rendered element (e.g. a map) would appear in a live environment.
 *
 * def — the component definition passed to the form engine to render the preview.
 * model — partial FormModel state; null if no model context is needed.
 * payload — form submission payload used to pre-populate the component.
 *
 * variants — alternative to a single render: an array of labelled def/model/payload sets,
 *   each rendered as a separate tab in the preview.
 */
