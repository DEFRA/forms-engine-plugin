import {
  ComponentType,
  ConditionType,
  ControllerPath,
  ControllerType,
  Engine,
  OperatorName,
  SchemaVersion
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Payment V2 conditional amounts',
  schema: SchemaVersion.V2,
  engine: Engine.V2,
  startPage: '/choice',
  pages: /** @type {const} */ ([
    {
      title: 'Choice',
      path: '/choice',
      components: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'yesNoField',
          title: 'Yes or no?',
          type: ComponentType.YesNoField,
          options: {}
        }
      ],
      next: []
    },
    {
      title: 'Gated',
      path: '/gated',
      condition: 'c1000000-0000-4000-8000-000000000001',
      components: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'textField',
          title: 'A question',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        }
      ],
      next: []
    },
    {
      title: 'Payment',
      path: '/payment',
      components: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          type: ComponentType.PaymentField,
          name: 'paymentField',
          title: 'Payment required',
          options: {
            amount: 50,
            description: 'Test payment',
            conditionalAmounts: [
              {
                condition: 'c1000000-0000-4000-8000-000000000001',
                amount: 0
              },
              {
                condition: 'c1000000-0000-4000-8000-000000000002',
                amount: 99
              }
            ]
          }
        }
      ],
      next: []
    },
    {
      title: '',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary
    }
  ]),
  lists: [],
  sections: [],
  conditions: [
    {
      id: 'c1000000-0000-4000-8000-000000000001',
      displayName: 'Yes selected',
      items: [
        {
          id: 'e1000000-0000-4000-8000-000000000001',
          componentId: '11111111-1111-4111-8111-111111111111',
          operator: OperatorName.Is,
          type: ConditionType.BooleanValue,
          value: true
        }
      ]
    },
    {
      id: 'c1000000-0000-4000-8000-000000000002',
      displayName: 'No selected',
      items: [
        {
          id: 'e1000000-0000-4000-8000-000000000002',
          componentId: '11111111-1111-4111-8111-111111111111',
          operator: OperatorName.Is,
          type: ConditionType.BooleanValue,
          value: false
        }
      ]
    }
  ]
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
