import {
  ComponentType,
  ControllerPath,
  ControllerType,
  Engine
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'File upload limits',
  engine: Engine.V2,
  schema: 2,
  startPage: '/min-max',
  pages: /** @type {const} */ ([
    {
      id: '3d2e8c2a-8e7f-4c0a-9b3b-2f9c3d4e5f01',
      path: '/min-max',
      title: 'Upload between 2 and 3 files',
      controller: ControllerType.FileUpload,
      components: [
        {
          id: '3d2e8c2a-8e7f-4c0a-9b3b-2f9c3d4e5f02',
          name: 'minMax',
          title: 'Upload between 2 and 3 files',
          type: ComponentType.FileUploadField,
          options: {},
          schema: { min: 2, max: 3 }
        }
      ],
      next: [{ path: '/exact' }]
    },
    {
      id: '3d2e8c2a-8e7f-4c0a-9b3b-2f9c3d4e5f03',
      path: '/exact',
      title: 'Upload exactly 2 files',
      controller: ControllerType.FileUpload,
      components: [
        {
          id: '3d2e8c2a-8e7f-4c0a-9b3b-2f9c3d4e5f04',
          name: 'exact',
          title: 'Upload exactly 2 files',
          type: ComponentType.FileUploadField,
          options: {},
          schema: { length: 2 }
        }
      ],
      next: [{ path: ControllerPath.Summary }]
    },
    {
      id: '3d2e8c2a-8e7f-4c0a-9b3b-2f9c3d4e5f05',
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
        'components.3d2e8c2a-8e7f-4c0a-9b3b-2f9c3d4e5f02.title':
          'Welsh Upload between 2 and 3 files',
        'components.3d2e8c2a-8e7f-4c0a-9b3b-2f9c3d4e5f04.title':
          'Welsh Upload exactly 2 files'
      }
    }
  }
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
