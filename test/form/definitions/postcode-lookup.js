import {
  ComponentType,
  ControllerType,
  Engine,
  SchemaVersion
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'UkAddressField with Postcode lookup',
  engine: Engine.V2,
  schema: SchemaVersion.V2,
  startPage: '/address',
  pages: [
    {
      title: 'Address',
      path: '/address',
      components: [
        {
          type: ComponentType.UkAddressField,
          title: 'What is your address?',
          name: 'ybMHIv',
          shortDescription: 'Address',
          hint: '',
          options: {
            required: true,
            usePostcodeLookup: true
          },
          id: 'ebc6cc6d-2596-4860-b62d-98510b277ac4'
        }
      ],
      next: [],
      id: 'c7ab16e8-819a-43bd-83fa-14c479d23961'
    },
    {
      title: '',
      path: '/summary',
      controller: ControllerType.Summary,
      components: [],
      id: '8d2aba52-314e-4a5b-b502-47e205877de5'
    }
  ],
  conditions: [],
  sections: [],
  lists: []
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
