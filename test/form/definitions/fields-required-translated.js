import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Fields required',
  startPage: '/components',
  pages: /** @type {const} */ ([
    {
      id: '4af89edc-2424-4fed-937c-500525667b96',
      path: '/components',
      title: 'Fields required',
      components: [
        {
          id: 'f4c68ce0-d868-43cb-87df-b80018dec23a',
          type: ComponentType.TextField,
          name: 'textField',
          title: 'Text field',
          hint: 'Help text',
          options: {},
          schema: {
            max: 30
          }
        },
        {
          id: '9d83327b-3783-430c-aef8-c73875672cae',
          type: ComponentType.MultilineTextField,
          name: 'multilineTextField',
          title: 'Multiline text field',
          hint: 'Help text',
          options: {},
          schema: {
            max: 30
          }
        },
        {
          id: '33bd0fbe-52d2-4fb4-94d1-b036747a9d38',
          type: ComponentType.NumberField,
          name: 'numberField',
          title: 'Number field',
          options: {},
          schema: {
            max: 2000
          }
        },
        {
          id: '03d0d43f-4dbb-4c52-9291-be63c4636748',
          type: ComponentType.DatePartsField,
          name: 'datePartsField',
          title: 'Date parts field',
          options: {}
        },
        {
          id: 'ba70dabf-ea01-4643-808c-24638743fcf7',
          type: ComponentType.MonthYearField,
          name: 'monthYearField',
          title: 'Month year field',
          options: {}
        },
        {
          id: '7d4660a1-2e5b-48d7-854d-3bb1fe75c2c3',
          type: ComponentType.YesNoField,
          name: 'yesNoField',
          title: 'Yes/No field',
          options: {}
        },
        {
          id: 'c5f73f1e-e15c-4558-afe9-63e8ca15ac35',
          type: ComponentType.EmailAddressField,
          name: 'emailAddressField',
          title: 'Email address field',
          options: {}
        },
        {
          id: '14875380-b27c-4119-829b-68f4aa427fca',
          type: ComponentType.TelephoneNumberField,
          name: 'telephoneNumberField',
          title: 'Telephone number field',
          options: {}
        },
        {
          id: '12ad0026-e0ac-4081-850a-a8eede6a5a8a',
          type: ComponentType.UkAddressField,
          name: 'addressField',
          title: 'Address field',
          options: {}
        },
        {
          id: '7817fa20-8791-40f7-a5f9-44593a4e44dc',
          type: ComponentType.RadiosField,
          name: 'radiosField',
          title: 'Radios field',
          list: 'companyType',
          options: {}
        },
        {
          id: '8a6a413f-28ca-464c-8cf8-09c54fbb68d8',
          type: ComponentType.SelectField,
          name: 'selectField',
          title: 'Select field',
          list: 'country',
          options: {}
        },
        {
          id: '7b7683c3-65b3-4640-90aa-63b82a9d4011',
          type: ComponentType.AutocompleteField,
          name: 'autocompleteField',
          title: 'Autocomplete field',
          list: 'country',
          options: {}
        },
        {
          id: 'e6fd3926-d294-45b6-be7e-a2d55c9f8a22',
          list: 'horseBreed',
          type: ComponentType.CheckboxesField,
          name: 'checkboxesSingle',
          title: 'Checkboxes field 1',
          hint: 'Select all that apply.',
          options: {}
        },
        {
          id: 'ace90ac8-00d8-4fbc-be0e-cbe02ac34b82',
          list: 'horseBreed',
          type: ComponentType.CheckboxesField,
          name: 'checkboxesMultiple',
          title: 'Checkboxes field 2',
          hint: 'Select all that apply.',
          options: {}
        },
        {
          id: '4a35371d-7d29-479c-af36-5d946f5f9f6a',
          list: 'points',
          type: ComponentType.CheckboxesField,
          name: 'checkboxesSingleNumber',
          title: 'Checkboxes field 3 (number)',
          hint: 'Select all that apply.',
          options: {}
        },
        {
          id: 'eed182fa-7438-4056-9c1d-6f841f3088d2',
          list: 'points',
          type: ComponentType.CheckboxesField,
          name: 'checkboxesMultipleNumber',
          title: 'Checkboxes field at least 2 items',
          hint: 'Select all that apply.',
          options: {},
          schema: {
            min: 2
          }
        },
        {
          id: '0f868ea2-119a-4b2f-8230-0e688a22a48d',
          type: ComponentType.EastingNorthingField,
          name: 'eastingNorthing',
          title: 'Easting northing field',
          options: {}
        },
        {
          id: 'ae9993c8-68b6-4f4e-b581-7bd545a0117a',
          type: ComponentType.GeospatialField,
          name: 'geospatial',
          title: 'Geospatial field',
          options: {
            countries: ['england']
          }
        },
        {
          id: 'd7bfe70f-63d8-4407-83b7-14ab28ea25cd',
          type: ComponentType.LatLongField,
          name: 'latLong',
          title: 'LatLong field',
          options: {}
        },
        {
          id: '288afb69-6e33-4a03-a11c-bf7a8ee44f0d',
          type: ComponentType.NationalGridFieldNumberField,
          name: 'nationalGrid',
          title: 'National Grid field',
          options: {}
        },
        {
          id: '1ad26d80-db7d-496d-9fcc-7c93fb9bf7e1',
          type: ComponentType.OsGridRefField,
          name: 'osGrid',
          title: 'OS Grid field',
          options: {}
        },
        {
          id: '9336089e-dc36-473f-9aee-1cf919919fe1',
          type: ComponentType.DeclarationField,
          name: 'declaration',
          title: 'Declaration',
          content:
            'By submitting this form, I agree to:\n\n- Provide accurate and complete information\n- Comply with all applicable regulations\n- Accept responsibility for any false statements',
          hint: 'Please read and confirm the following terms',
          options: {}
        }
      ],
      next: [
        {
          path: '/summary'
        }
      ]
    },
    {
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Summary'
    }
  ]),
  lists: [
    {
      name: 'companyType',
      title: 'Company type',
      type: 'string',
      items: [
        { text: 'Sole trader', value: 'soleTrader' },
        { text: 'Private Limited Company', value: 'privateLimitedCompany' },
        { text: 'Public Limited Company', value: 'publicLimitedCompany' },
        {
          text: 'Limited Liability Partnership',
          value: 'limitedLiabilityPartnership'
        },
        { text: 'Charity', value: 'charity' },
        { text: 'Other', value: 'other' }
      ]
    },
    {
      name: 'country',
      title: 'Country',
      type: 'number',
      items: [
        { text: 'Afghanistan', value: 910400000 },
        { text: 'Albania', value: 910400001 },
        { text: 'Algeria', value: 910400002 },
        { text: 'Andorra', value: 910400003 },
        { text: 'Angola', value: 910400004 },
        { text: 'Antigua and Barbuda', value: 910400005 },
        { text: 'Argentina', value: 910400006 },
        { text: 'Armenia', value: 910400007 },
        { text: 'Australia', value: 910400008 },
        { text: 'Austria', value: 910400009 },
        { text: 'Azerbaijan', value: 910400010 },
        { text: 'Bahrain', value: 910400011 },
        { text: 'Bangladesh', value: 910400012 },
        { text: 'Barbados', value: 910400013 },
        { text: 'Belarus', value: 910400014 },
        { text: 'Belgium', value: 910400015 },
        { text: 'Belize', value: 910400016 },
        { text: 'Benin', value: 910400017 },
        { text: 'Bhutan', value: 910400018 },
        { text: 'Bolivia', value: 910400019 },
        { text: 'Bosnia and Herzegovina', value: 910400020 },
        { text: 'Botswana', value: 910400021 },
        { text: 'Brazil', value: 910400022 },
        { text: 'Brunei', value: 910400023 },
        { text: 'Bulgaria', value: 910400024 },
        { text: 'Burkina Faso', value: 910400025 },
        { text: 'Burma', value: 910400026 },
        { text: 'Burundi', value: 910400027 },
        { text: 'Cambodia', value: 910400028 },
        { text: 'Cameroon', value: 910400029 },
        { text: 'Canada', value: 910400030 },
        { text: 'Cape Verde', value: 910400031 },
        { text: 'Central African Republic', value: 910400032 },
        { text: 'Chad', value: 910400033 },
        { text: 'Chile', value: 910400034 },
        { text: 'China', value: 910400035 },
        { text: 'Colombia', value: 910400036 },
        { text: 'Comoros', value: 910400037 },
        { text: 'Congo', value: 910400038 },
        { text: 'Congo (Democratic Republic)', value: 910400039 },
        { text: 'Costa Rica', value: 910400040 },
        { text: 'Croatia', value: 910400041 },
        { text: 'Cuba', value: 910400042 },
        { text: 'Cyprus', value: 910400043 },
        { text: 'Czech Republic', value: 910400044 },
        { text: 'Denmark', value: 910400045 },
        { text: 'Djibouti', value: 910400046 },
        { text: 'Dominica', value: 910400047 },
        { text: 'Dominican Republic', value: 910400048 },
        { text: 'East Timor', value: 910400049 },
        { text: 'Ecuador', value: 910400050 },
        { text: 'Egypt', value: 910400051 },
        { text: 'El Salvador', value: 910400052 },
        { text: 'Equatorial Guinea', value: 910400053 },
        { text: 'Eritrea', value: 910400054 },
        { text: 'Estonia', value: 910400055 },
        { text: 'Ethiopia', value: 910400056 },
        { text: 'Fiji', value: 910400057 },
        { text: 'Finland', value: 910400058 },
        { text: 'France', value: 910400059 },
        { text: 'Gabon', value: 910400060 },
        { text: 'Georgia', value: 910400061 },
        { text: 'Germany', value: 910400062 },
        { text: 'Ghana', value: 910400063 },
        { text: 'Greece', value: 910400064 },
        { text: 'Grenada', value: 910400065 },
        { text: 'Guatemala', value: 910400066 },
        { text: 'Guinea', value: 910400067 },
        { text: 'Guinea-Bissau', value: 910400068 },
        { text: 'Guyana', value: 910400069 },
        { text: 'Haiti', value: 910400070 },
        { text: 'Honduras', value: 910400071 },
        { text: 'Hungary', value: 910400072 },
        { text: 'Iceland', value: 910400073 },
        { text: 'India', value: 910400074 },
        { text: 'Indonesia', value: 910400075 },
        { text: 'Iran', value: 910400076 },
        { text: 'Iraq', value: 910400077 },
        { text: 'Ireland', value: 910400078 },
        { text: 'Israel', value: 910400079 },
        { text: 'Italy', value: 910400080 },
        { text: 'Ivory Coast', value: 910400081 },
        { text: 'Jamaica', value: 910400082 },
        { text: 'Japan', value: 910400083 },
        { text: 'Jordan', value: 910400084 },
        { text: 'Kazakhstan', value: 910400085 },
        { text: 'Kenya', value: 910400086 },
        { text: 'Kiribati', value: 910400087 },
        { text: 'Kosovo', value: 910400088 },
        { text: 'Kuwait', value: 910400089 },
        { text: 'Kyrgyzstan', value: 910400090 },
        { text: 'Laos', value: 910400091 },
        { text: 'Latvia', value: 910400092 },
        { text: 'Lebanon', value: 910400093 },
        { text: 'Lesotho', value: 910400094 },
        { text: 'Liberia', value: 910400095 },
        { text: 'Libya', value: 910400096 },
        { text: 'Liechtenstein', value: 910400097 },
        { text: 'Lithuania', value: 910400098 },
        { text: 'Luxembourg', value: 910400099 },
        { text: 'Macedonia', value: 910400100 },
        { text: 'Madagascar', value: 910400101 },
        { text: 'Malawi', value: 910400102 },
        { text: 'Malaysia', value: 910400103 },
        { text: 'Maldives', value: 910400104 },
        { text: 'Mali', value: 910400105 },
        { text: 'Malta', value: 910400106 },
        { text: 'Marshall Islands', value: 910400107 },
        { text: 'Mauritania', value: 910400108 },
        { text: 'Mauritius', value: 910400109 },
        { text: 'Mexico', value: 910400110 },
        { text: 'Micronesia', value: 910400111 },
        { text: 'Moldova', value: 910400112 },
        { text: 'Monaco', value: 910400113 },
        { text: 'Mongolia', value: 910400114 },
        { text: 'Montenegro', value: 910400115 },
        { text: 'Morocco', value: 910400116 },
        { text: 'Mozambique', value: 910400117 },
        { text: 'Namibia', value: 910400118 },
        { text: 'Nauru', value: 910400119 },
        { text: 'Nepal', value: 910400120 },
        { text: 'Netherlands', value: 910400121 },
        { text: 'New Zealand', value: 910400122 },
        { text: 'Nicaragua', value: 910400123 },
        { text: 'Niger', value: 910400124 },
        { text: 'Nigeria', value: 910400125 },
        { text: 'North Korea', value: 910400126 },
        { text: 'Norway', value: 910400127 },
        { text: 'Oman', value: 910400128 },
        { text: 'Pakistan', value: 910400129 },
        { text: 'Palau', value: 910400130 },
        { text: 'Panama', value: 910400131 },
        { text: 'Papua New Guinea', value: 910400132 },
        { text: 'Paraguay', value: 910400133 },
        { text: 'Peru', value: 910400134 },
        { text: 'Philippines', value: 910400135 },
        { text: 'Poland', value: 910400136 },
        { text: 'Portugal', value: 910400137 },
        { text: 'Qatar', value: 910400138 },
        { text: 'Romania', value: 910400139 },
        { text: 'Russia', value: 910400140 },
        { text: 'Rwanda', value: 910400141 },
        { text: 'Samoa', value: 910400142 },
        { text: 'San Marino', value: 910400143 },
        { text: 'Sao Tome and Principe', value: 910400144 },
        { text: 'Saudi Arabia', value: 910400145 },
        { text: 'Senegal', value: 910400146 },
        { text: 'Serbia', value: 910400147 },
        { text: 'Seychelles', value: 910400148 },
        { text: 'Sierra Leone', value: 910400149 },
        { text: 'Singapore', value: 910400150 },
        { text: 'Slovakia', value: 910400151 },
        { text: 'Slovenia', value: 910400152 },
        { text: 'Solomon Islands', value: 910400153 },
        { text: 'Somalia', value: 910400154 },
        { text: 'South Africa', value: 910400155 },
        { text: 'South Korea', value: 910400156 },
        { text: 'South Sudan', value: 910400157 },
        { text: 'Spain', value: 910400158 },
        { text: 'Sri Lanka', value: 910400159 },
        { text: 'St Kitts and Nevis', value: 910400160 },
        { text: 'St Lucia', value: 910400161 },
        { text: 'St Vincent', value: 910400162 },
        { text: 'Sudan', value: 910400163 },
        { text: 'Suriname', value: 910400164 },
        { text: 'Swaziland', value: 910400165 },
        { text: 'Sweden', value: 910400166 },
        { text: 'Switzerland', value: 910400167 },
        { text: 'Syria', value: 910400168 },
        { text: 'Tajikistan', value: 910400169 },
        { text: 'Tanzania', value: 910400170 },
        { text: 'Thailand', value: 910400171 },
        { text: 'The Bahamas', value: 910400172 },
        { text: 'The Gambia', value: 910400173 },
        { text: 'Togo', value: 910400174 },
        { text: 'Tonga', value: 910400175 },
        { text: 'Trinidad and Tobago', value: 910400176 },
        { text: 'Tunisia', value: 910400177 },
        { text: 'Turkey', value: 910400178 },
        { text: 'Turkmenistan', value: 910400179 },
        { text: 'Tuvalu', value: 910400180 },
        { text: 'Uganda', value: 910400181 },
        { text: 'Ukraine', value: 910400182 },
        { text: 'United Arab Emirates', value: 910400183 },
        { text: 'United Kingdom', value: 910400184 },
        { text: 'United States', value: 910400185 },
        { text: 'Uruguay', value: 910400186 },
        { text: 'Uzbekistan', value: 910400187 },
        { text: 'Vanuatu', value: 910400188 },
        { text: 'Vatican City', value: 910400189 },
        { text: 'Venezuela', value: 910400190 },
        { text: 'Vietnam', value: 910400191 },
        { text: 'Yemen', value: 910400192 },
        { text: 'Zambia', value: 910400193 },
        { text: 'Zimbabwe', value: 910400194 },
        { text: 'England', value: 910400195 },
        { text: 'Wales', value: 910400196 },
        { text: 'Scotland', value: 910400197 },
        { text: 'Northern Ireland', value: 910400198 }
      ]
    },
    {
      name: 'horseBreed',
      title: 'Horse breed',
      type: 'string',
      items: [
        { text: 'Arabian', value: 'Arabian' },
        { text: 'Patomine', value: 'Patomine' },
        { text: 'Shire', value: 'Shire' },
        { text: 'Shetland', value: 'Shetland' },
        { text: 'Race', value: 'Race' }
      ]
    },
    {
      name: 'points',
      title: 'Number of points',
      type: 'number',
      items: [
        { text: 'None', value: 0 },
        { text: '1 point', value: 1 },
        { text: '2 points', value: 2 },
        { text: '3 points', value: 3 },
        { text: '4 points', value: 4 }
      ]
    }
  ],
  sections: [],
  conditions: [],
  metadata: {
    translations: {
      cy: {
        'form.title': 'Welsh fields required',
        'pages.4af89edc-2424-4fed-937c-500525667b96.title':
          'Welsh fields required translated',
        'components.f4c68ce0-d868-43cb-87df-b80018dec23a.title':
          'Welsh Text field',
        'components.f4c68ce0-d868-43cb-87df-b80018dec23a.shortDescription':
          'Welsh textfield short desc',
        'components.f4c68ce0-d868-43cb-87df-b80018dec23a.errorDescription':
          'Welsh textfield error desc',
        'components.9d83327b-3783-430c-aef8-c73875672cae.title':
          'Welsh Multiline text field',
        'components.33bd0fbe-52d2-4fb4-94d1-b036747a9d38.title':
          'Welsh Number field',
        'components.03d0d43f-4dbb-4c52-9291-be63c4636748.title':
          'Welsh Date parts field',
        'components.ba70dabf-ea01-4643-808c-24638743fcf7.title':
          'Welsh Month year field',
        'components.7d4660a1-2e5b-48d7-854d-3bb1fe75c2c3.title':
          'Welsh Yes/No field',
        'components.c5f73f1e-e15c-4558-afe9-63e8ca15ac35.title':
          'Welsh Email address field',
        'components.14875380-b27c-4119-829b-68f4aa427fca.title':
          'Welsh Telephone number field',
        'components.12ad0026-e0ac-4081-850a-a8eede6a5a8a.title':
          'Welsh Address field',
        'components.7817fa20-8791-40f7-a5f9-44593a4e44dc.title':
          'Welsh Radios field',
        'components.8a6a413f-28ca-464c-8cf8-09c54fbb68d8.title':
          'Welsh Select field',
        'components.7b7683c3-65b3-4640-90aa-63b82a9d4011.title':
          'Welsh Autocomplete field',
        'components.e6fd3926-d294-45b6-be7e-a2d55c9f8a22.title':
          'Welsh Checkboxes field 1',
        'components.ace90ac8-00d8-4fbc-be0e-cbe02ac34b82.title':
          'Welsh Checkboxes field 2',
        'components.4a35371d-7d29-479c-af36-5d946f5f9f6a.title':
          'Welsh Checkboxes field 3 (number)',
        'components.eed182fa-7438-4056-9c1d-6f841f3088d2.title':
          'Welsh Checkboxes field at least 2 items',
        'components.0f868ea2-119a-4b2f-8230-0e688a22a48d.title':
          'Welsh EastingNorthing field',
        'components.ae9993c8-68b6-4f4e-b581-7bd545a0117a.title':
          'Welsh Geospatial field',
        'components.d7bfe70f-63d8-4407-83b7-14ab28ea25cd.title':
          'Welsh LatLong field',
        'components.288afb69-6e33-4a03-a11c-bf7a8ee44f0d.title':
          'Welsh National Grid field',
        'components.1ad26d80-db7d-496d-9fcc-7c93fb9bf7e1.title':
          'Welsh OS Grid field',
        'components.9336089e-dc36-473f-9aee-1cf919919fe1.title':
          'Welsh Declaration'
      }
    }
  }
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
