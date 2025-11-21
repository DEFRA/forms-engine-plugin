import {
  ComponentType,
  ConditionType,
  ControllerType,
  Engine,
  OperatorName
} from '@defra/forms-model'

/**
 * Pages:
 * - /age (Are you over 18?)
 * - IF NOT OVER 18 --> /unavailable-service-page (Unavailable service page - terminal) --> EXIT
 * - IF OVER 18 --> /pizza (Do you like pizza?)
 * - IF LIKES PIZZA --> /favourite-pizza (What is your favourite pizza?)
 * - /favourite-food (What is your favourite food?)
 * - /summary (Summary)
 */

export default /** @satisfies {FormDefinition} */ ({
  name: 'Return URL tests',
  engine: Engine.V2,
  schema: 2,
  startPage: '/age',
  pages: [
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
      next: []
    },
    {
      title: 'Unavailable service page',
      controller: ControllerType.Terminal,
      path: '/unavailable-service-page',
      components: [
        {
          title: 'Unavailable service page',
          name: 'serviceNotAvailable',
          type: ComponentType.Markdown,
          content: 'Unavailable service message content.',
          options: {}
        }
      ],
      next: [],
      id: '53bd4fca-becb-4681-b91a-09132f3500bb',
      condition: 'd1f9fcc7-f098-47e7-9d31-4f5ee57ba985'
    },
    {
      title: 'Do you like pizza?',
      path: '/pizza',
      components: [
        {
          type: ComponentType.YesNoField,
          title: 'Do you like pizza?',
          name: 'likesPizza',
          id: '48287b43-c54f-4084-86ad-00b2a979e78d',
          options: { required: true }
        }
      ],
      id: '12345678-90ab-cdef-1234-567890abcdef',
      next: []
    },
    {
      title: 'What is your favourite pizza?',
      path: '/favourite-pizza',
      components: [
        {
          type: ComponentType.TextField,
          title: 'What is your favourite pizza?',
          name: 'favouritePizza',
          shortDescription: 'favourite pizza',
          options: {
            required: true
          },
          schema: {},
          id: 'dadadada-4838-4c28-a0ef-7cace4a11c0f'
        }
      ],
      next: [],
      id: 'efcd83c3-6ad4-4c54-8c39-ef87f79101ef',
      condition: 'e53fa1ef-a101-4c8c-81f1-e78b466818d8'
    },
    {
      title: 'What is your favourite food?',
      path: '/favourite-food',
      components: [
        {
          type: ComponentType.TextField,
          title: 'What is your favourite food?',
          name: 'favouriteFood',
          shortDescription: 'favourite food',
          options: {
            required: true
          },
          schema: {},
          id: 'bbefe85d-4838-4c28-a0ef-7cace4a11c0f'
        }
      ],
      next: [],
      id: 'adadadad-6ad4-4c54-8c39-ef87f79101ef'
    },
    {
      id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
      title: 'Summary',
      path: '/summary',
      controller: ControllerType.Summary
    }
  ],
  conditions: [
    {
      items: [
        {
          id: 'c833b177-0cba-49de-b670-a297c6db45b8',
          componentId: 'c977e76e-49ab-4443-b93e-e19e8d9c81ac',
          operator: OperatorName.Is,
          value: false,
          type: ConditionType.BooleanValue
        }
      ],
      displayName: 'is over 18',
      id: 'd1f9fcc7-f098-47e7-9d31-4f5ee57ba985'
    },
    {
      items: [
        {
          id: '48287b43-c54f-4084-86ad-00b2a979e78d',
          componentId: '48287b43-c54f-4084-86ad-00b2a979e78d',
          operator: OperatorName.Is,
          value: true,
          type: ConditionType.BooleanValue
        }
      ],
      displayName: 'likes pizza',
      id: 'e53fa1ef-a101-4c8c-81f1-e78b466818d8'
    }
  ],
  sections: [],
  lists: []
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
