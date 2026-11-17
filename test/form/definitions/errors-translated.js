import {
  ComponentType,
  ControllerPath,
  ControllerType,
  Engine
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Errors translated',
  engine: Engine.V2,
  schema: 2,
  startPage: '/details',
  pages: /** @type {const} */ ([
    {
      id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f01',
      path: '/details',
      title: 'Your details',
      components: [
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f02',
          name: 'name',
          title: 'Name',
          type: ComponentType.TextField,
          options: { required: false },
          schema: { min: 3 }
        },
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f03',
          name: 'code',
          title: 'Code',
          type: ComponentType.TextField,
          options: { required: false },
          schema: { regex: '^[A-Z]+$' }
        },
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f04',
          name: 'age',
          title: 'Age',
          type: ComponentType.NumberField,
          options: { required: false },
          schema: {}
        },
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f05',
          name: 'email',
          title: 'Email',
          type: ComponentType.EmailAddressField,
          options: { required: false }
        },
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f06',
          name: 'date',
          title: 'Date',
          type: ComponentType.DatePartsField,
          options: { required: false }
        },
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f07',
          name: 'hours',
          title: 'Hours',
          type: ComponentType.CheckboxesField,
          list: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f12',
          options: { required: false },
          schema: { min: 2 }
        }
      ],
      next: [{ path: '/people' }]
    },
    {
      id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f08',
      path: '/people',
      title: 'People',
      controller: ControllerType.Repeat,
      repeat: {
        options: { name: 'people', title: 'Person' },
        schema: { min: 2, max: 3 }
      },
      components: [
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f09',
          name: 'person',
          title: 'Person name',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        }
      ],
      next: [{ path: ControllerPath.Summary }]
    },
    {
      id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f10',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Check your answers'
    }
  ]),
  sections: [],
  conditions: [],
  lists: [
    {
      id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f12',
      name: 'listString',
      title: 'Hours',
      type: 'string',
      items: [
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f13',
          text: '1 hour',
          value: '1'
        },
        {
          id: '2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f14',
          text: '2 hours',
          value: '2'
        }
      ]
    }
  ],
  metadata: {
    translations: {
      cy: {
        'components.2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f02.title': 'Welsh Name',
        'components.2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f03.title': 'Welsh Code',
        'components.2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f04.title': 'Welsh Age',
        'components.2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f05.title': 'Welsh Email',
        'components.2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f06.title': 'Welsh Date',
        'components.2c1d7b1f-7d6e-4b9f-8a2f-1e8b2d3c4f07.title': 'Welsh Hours'
      }
    }
  }
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
