import {
  ComponentType,
  ControllerPath,
  ControllerType,
  Engine
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Repeat translated',
  engine: Engine.V2,
  schema: 2,
  startPage: '/people',
  pages: /** @type {const} */ ([
    {
      id: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c01',
      path: '/people',
      title: 'People',
      controller: ControllerType.Repeat,
      repeat: {
        options: { name: 'people', title: 'Person' },
        schema: { min: 2, max: 3 }
      },
      components: [
        {
          id: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c02',
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
      id: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c03',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Check your answers'
    }
  ]),
  sections: [],
  conditions: [],
  lists: [],
  metadata: {
    translations: {
      cy: {
        'components.5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c02.title': 'Enw person'
      }
    }
  }
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
