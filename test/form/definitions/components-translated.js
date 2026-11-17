import {
  ComponentType,
  ControllerPath,
  ControllerType,
  Engine
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Components translated',
  engine: Engine.V2,
  schema: 2,
  startPage: '/upload',
  pages: /** @type {const} */ ([
    {
      id: '1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e01',
      path: '/upload',
      title: 'Upload your plan',
      controller: ControllerType.FileUpload,
      components: [
        {
          id: '1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e02',
          name: 'guidance',
          title: 'Guidance',
          type: ComponentType.Markdown,
          content: 'Read the guidance first',
          options: {}
        },
        {
          id: '1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e03',
          name: 'plan',
          title: 'Upload your plan',
          type: ComponentType.FileUploadField,
          options: {},
          schema: {}
        }
      ],
      next: [{ path: '/payment' }]
    },
    {
      id: '1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e04',
      path: '/payment',
      title: 'Pay the fee',
      components: [
        {
          id: '1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e05',
          name: 'payment',
          title: 'Pay the licence fee',
          type: ComponentType.PaymentField,
          options: { amount: 10, description: 'Licence fee' }
        }
      ],
      next: [{ path: ControllerPath.Summary }]
    },
    {
      id: '1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e06',
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
        'pages.1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e01.title':
          'Welsh Upload your plan',
        'components.1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e02.content':
          'Welsh Read the guidance first',
        'components.1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e03.title':
          'Welsh Upload your plan',
        'pages.1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e04.title': 'Welsh Pay the fee',
        'components.1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e05.title':
          'Welsh Pay the licence fee',
        'components.1b0c6a0e-6c5d-4a8e-9f1e-0d7a1c2b3e05.paymentDescription':
          'Welsh Licence fee'
      }
    }
  }
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
