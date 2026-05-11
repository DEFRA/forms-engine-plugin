// Fixture definitions for component preview generation.
// Each fixture provides the minimal data needed to call createComponent() and getViewModel().
// List-based components include a model stub with getList() so the constructor can resolve items.
// PaymentField uses variants to show unpaid and paid states.

/**
 * @typedef {import('@defra/forms-model').ComponentDef} ComponentDef
 * @typedef {import('../src/server/plugins/engine/models/FormModel.js').FormModel} FormModel
 * @typedef {import('../src/server/plugins/engine/types.js').FormPayload} FormPayload
 * @typedef {{ def: ComponentDef, model: object|null, payload: FormPayload }} FixtureRender
 * @typedef {{ label: string } & FixtureRender} FixtureVariant
 * @typedef {{ mapPlaceholder?: boolean } & (FixtureRender | { variants: FixtureVariant[] })} Fixture
 */

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

/** @type {Partial<Record<import('@defra/forms-model').ComponentType, Fixture>>} */
export const fixtures = {
  [ComponentType.TextField]: {
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
  [ComponentType.FileUploadField]: {
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
  [ComponentType.Html]: {
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
    def: {
      type: ComponentType.LatLongField,
      name: 'location',
      title: 'Enter a latitude and longitude',
      options: {},
      schema: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  [ComponentType.EastingNorthingField]: {
    def: {
      type: ComponentType.EastingNorthingField,
      name: 'location',
      title: 'Enter an easting and northing',
      options: {},
      schema: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  [ComponentType.OsGridRefField]: {
    def: {
      type: ComponentType.OsGridRefField,
      name: 'location',
      title: 'Enter an OS grid reference',
      options: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  [ComponentType.NationalGridFieldNumberField]: {
    def: {
      type: ComponentType.NationalGridFieldNumberField,
      name: 'location',
      title: 'Enter a national grid reference',
      options: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  [ComponentType.GeospatialField]: {
    def: {
      type: ComponentType.GeospatialField,
      name: 'location',
      title: 'Enter a location',
      options: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  [ComponentType.PaymentField]: {
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
        // PaymentState is not part of FormValue — PaymentField.getViewModel casts payload[name] to unknown and uses a type guard
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
