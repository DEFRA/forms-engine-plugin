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
    def: {
      type: 'TextField',
      name: 'full-name',
      title: 'What is your full name?',
      hint: 'As shown on your passport',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  EmailAddressField: {
    def: {
      type: 'EmailAddressField',
      name: 'email',
      title: 'What is your email address?',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  MultilineTextField: {
    def: {
      type: 'MultilineTextField',
      name: 'description',
      title: 'Describe your issue',
      hint: 'Include as much detail as you can',
      options: { rows: 5 },
      schema: {}
    },
    model: null,
    payload: {}
  },
  NumberField: {
    def: {
      type: 'NumberField',
      name: 'age',
      title: 'What is your age?',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  TelephoneNumberField: {
    def: {
      type: 'TelephoneNumberField',
      name: 'phone',
      title: 'What is your telephone number?',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  MonthYearField: {
    def: {
      type: 'MonthYearField',
      name: 'start-date',
      title: 'When did this start?',
      hint: 'For example, 3 2025',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  DatePartsField: {
    def: {
      type: 'DatePartsField',
      name: 'dob',
      title: 'What is your date of birth?',
      hint: 'For example, 27 3 2007',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  UkAddressField: {
    def: {
      type: 'UkAddressField',
      name: 'address',
      title: 'What is your address?',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  YesNoField: {
    def: {
      type: 'YesNoField',
      name: 'agree',
      title: 'Do you agree?',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  RadiosField: {
    def: {
      type: 'RadiosField',
      name: 'colour',
      title: 'What is your favourite colour?',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  CheckboxesField: {
    def: {
      type: 'CheckboxesField',
      name: 'colours',
      title: 'Which colours do you like?',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  SelectField: {
    def: {
      type: 'SelectField',
      name: 'country',
      title: 'Select a country',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  AutocompleteField: {
    def: {
      type: 'AutocompleteField',
      name: 'country',
      title: 'Select a country',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  DeclarationField: {
    def: {
      type: 'DeclarationField',
      name: 'declaration',
      title: 'Declaration',
      content: 'I confirm that the information I have provided is correct.',
      options: {}
    },
    model: null,
    payload: {}
  },
  FileUploadField: {
    def: {
      type: 'FileUploadField',
      name: 'upload',
      title: 'Upload a document',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  Html: {
    def: {
      type: 'Html',
      name: 'info',
      title: 'HTML content',
      content: '<p>This is an <strong>HTML</strong> content component.</p>',
      options: {}
    },
    model: null,
    payload: {}
  },
  InsetText: {
    def: {
      type: 'InsetText',
      name: 'notice',
      title: 'Important notice',
      content: 'You can only apply once every 12 months.',
      options: {}
    },
    model: null,
    payload: {}
  },
  Details: {
    def: {
      type: 'Details',
      name: 'help',
      title: 'Help with this question',
      content: 'This information is needed to process your application.',
      options: {}
    },
    model: null,
    payload: {}
  },
  Markdown: {
    def: {
      type: 'Markdown',
      name: 'guidance',
      title: 'Guidance',
      content: '## Guidance\n\nPlease read this carefully before continuing.',
      options: {}
    },
    model: null,
    payload: {}
  },
  List: {
    def: {
      type: 'List',
      name: 'steps',
      title: 'What you need to do',
      list: 'options',
      options: {}
    },
    model: sampleList,
    payload: {}
  },
  HiddenField: {
    def: {
      type: 'HiddenField',
      name: 'ref',
      title: 'Hidden reference',
      options: {},
      schema: {}
    },
    model: null,
    payload: {}
  },
  LatLongField: {
    def: {
      type: 'LatLongField',
      name: 'location',
      title: 'Enter a latitude and longitude',
      options: {},
      schema: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  EastingNorthingField: {
    def: {
      type: 'EastingNorthingField',
      name: 'location',
      title: 'Enter an easting and northing',
      options: {},
      schema: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  OsGridRefField: {
    def: {
      type: 'OsGridRefField',
      name: 'location',
      title: 'Enter an OS grid reference',
      options: {},
      schema: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  NationalGridFieldNumberField: {
    def: {
      type: 'NationalGridFieldNumberField',
      name: 'location',
      title: 'Enter a national grid reference',
      options: {},
      schema: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  GeospatialField: {
    def: {
      type: 'GeospatialField',
      name: 'location',
      title: 'Enter a location',
      options: {},
      schema: {}
    },
    model: null,
    payload: {},
    mapPlaceholder: true
  },
  PaymentField: {
    variants: [
      {
        label: 'Before payment',
        def: {
          type: 'PaymentField',
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
          type: 'PaymentField',
          name: 'payment',
          title: 'Pay for your application',
          options: { amount: 2300, description: 'Application fee' }
        },
        model: null,
        payload: {
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
        }
      }
    ]
  }
}
