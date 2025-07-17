import {
  ComponentType,
  ConditionType,
  ControllerType,
  Coordinator,
  Engine,
  OperatorName,
  SchemaVersion
} from '@defra/forms-model'

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */

export default /** @satisfies {FormDefinition} */ ({
  name: 'joined-conditions-simple',
  engine: Engine.V2,
  schema: SchemaVersion.V2,
  startPage: '/name',
  pages: [
    {
      title: 'What is your name?',
      path: '/name',
      components: [
        {
          type: ComponentType.TextField,
          title: 'What is your name?',
          name: 'userName',
          id: '87b987e8-bcf9-4ff9-92af-57c34c45995a',
          options: { required: true },
          schema: {}
        }
      ],
      id: '3bdfacd3-c3f8-4a19-b280-7265023d854e',
      next: []
    },
    {
      title: 'Are you over 18?',
      path: '/age',
      components: [
        {
          type: ComponentType.YesNoField,
          title: 'Are you over 18?',
          name: 'isOverEighteen',
          id: 'c977e76e-49ab-4443-b93e-e19e8d9c81ac',
          options: { required: true }
        }
      ],
      id: '7be18dec-0680-4c41-9981-357aa085429d',
      condition: 'd15aff7a-6224-40a2-8e5f-51a5af2f7910',
      next: []
    },
    {
      title: 'Simple AND Page',
      path: '/simple-and-page',
      components: [
        {
          type: ComponentType.Markdown,
          title: 'Information',
          content: '# This page shows when user is Bob AND over 18',
          options: {},
          name: 'simpleAndInfo',
          id: 'a0b1221b-8895-41e2-b99b-d62c33501023'
        }
      ],
      id: '0c25bcd9-143c-4ba0-b1f1-08f8bed82d8d',
      condition: 'db43c6bc-9ce6-478b-8345-4fff5eff2ba3',
      next: []
    },
    {
      id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
      title: 'Summary',
      path: '/summary',
      controller: ControllerType.Summary
    }
  ],
  conditions: [
    // Basic conditions
    {
      items: [
        {
          id: 'fea9f725-3879-426a-8125-75d0da6995ac',
          componentId: '87b987e8-bcf9-4ff9-92af-57c34c45995a',
          operator: OperatorName.Is,
          value: 'Bob',
          type: ConditionType.StringValue
        }
      ],
      displayName: 'is Bob',
      id: 'd15aff7a-6224-40a2-8e5f-51a5af2f7910'
    },
    {
      items: [
        {
          id: 'c833b177-0cba-49de-b670-a297c6db45b8',
          componentId: 'c977e76e-49ab-4443-b93e-e19e8d9c81ac',
          operator: OperatorName.Is,
          value: true,
          type: ConditionType.BooleanValue
        }
      ],
      displayName: 'is over 18',
      id: 'd1f9fcc7-f098-47e7-9d31-4f5ee57ba985'
    },
    // Joined condition: is Bob AND over 18
    {
      displayName: 'is Bob AND over 18',
      coordinator: Coordinator.AND,
      items: [
        {
          id: 'a906e343-5d0e-421e-81a4-3afa68fac011',
          conditionId: 'd15aff7a-6224-40a2-8e5f-51a5af2f7910'
        },
        {
          id: '3b306a85-a365-4bfc-b9f0-3f868e896da2',
          conditionId: 'd1f9fcc7-f098-47e7-9d31-4f5ee57ba985'
        }
      ],
      id: 'db43c6bc-9ce6-478b-8345-4fff5eff2ba3'
    }
  ],
  lists: [],
  sections: []
})
