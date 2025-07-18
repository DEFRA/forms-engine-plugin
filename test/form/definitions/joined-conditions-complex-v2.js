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
  name: 'joined conditions test',
  engine: Engine.V2,
  schema: SchemaVersion.V2,
  startPage: '/what-is-your-name',
  pages: [
    {
      title: 'What is your name?',
      path: '/what-is-your-name',
      components: [
        {
          type: ComponentType.TextField,
          title: 'What is your name?',
          name: 'fsZNJr',
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
      path: '/are-you-over-18',
      components: [
        {
          type: ComponentType.YesNoField,
          title: 'Are you over 18?',
          name: 'DaBGpS',
          id: 'c977e76e-49ab-4443-b93e-e19e8d9c81ac',
          options: { required: true }
        }
      ],
      id: '7be18dec-0680-4c41-9981-357aa085429d',
      next: [],
      condition: 'd15aff7a-6224-40a2-8e5f-51a5af2f7910'
    },
    {
      title: 'What is your date of birth?',
      path: '/what-is-your-dob',
      components: [
        {
          type: ComponentType.DatePartsField,
          title: 'What is your date of birth?',
          name: 'eNanXF',
          id: '3733ff68-3c72-4e42-9362-a792217d235d',
          options: { required: true }
        }
      ],
      id: '10eb4b6a-caa6-4b78-9dd1-9c853ef33222',
      next: []
    },
    {
      title: 'What is your favourite color?',
      path: '/favourite-color',
      components: [
        {
          type: ComponentType.RadiosField,
          title: 'What is your favourite color?',
          name: 'favoriteColor',
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          options: { required: true },
          list: 'a1b2c3d4-e5f6-7890-abcd-ef1234567907'
        }
      ],
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
      next: []
    },
    {
      title: 'What is your occupation?',
      path: '/occupation',
      components: [
        {
          type: ComponentType.TextField,
          title: 'What is your occupation?',
          name: 'occupation',
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892',
          options: { required: true },
          schema: {}
        }
      ],
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567893',
      next: [],
      condition: '27380e0d-1257-4400-ba45-26e66f2770fb'
    },
    {
      title: 'Is Bob and Over 18',
      path: '/is-bob-and-over-18',
      components: [
        {
          type: ComponentType.Markdown,
          title: 'Information',
          content: '# This page shows when user is Bob AND over 18',
          options: {},
          name: 'IcvwbU',
          id: 'a0b1221b-8895-41e2-b99b-d62c33501023'
        }
      ],
      next: [],
      id: '0c25bcd9-143c-4ba0-b1f1-08f8bed82d8d',
      condition: 'db43c6bc-9ce6-478b-8345-4fff5eff2ba3'
    },
    {
      title: 'Complex nested condition page',
      path: '/complex-nested-page',
      components: [
        {
          type: ComponentType.TextField,
          title: 'This page demonstrates complex nested conditions',
          name: 'complexField',
          id: '6be952dd-10f1-4642-8af6-18e4e082756e',
          options: { required: true },
          schema: {}
        }
      ],
      id: '97d57deb-0cf9-4321-bc1a-458e44279a5a',
      next: [],
      condition: '0f545894-a0f4-4d77-a000-d2833cc113d8'
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
          id: 'd9ab4c2f-7cac-469e-92a4-9170dc9c8b30',
          componentId: '3733ff68-3c72-4e42-9362-a792217d235d',
          operator: OperatorName.Is,
          type: ConditionType.DateValue,
          value: '2001-01-01'
        }
      ],
      displayName: 'is born on 01/01/2001',
      id: '2ff0c205-9421-4816-94d5-b33851a42c88'
    },
    {
      items: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567895',
          componentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          operator: OperatorName.Is,
          value: 'blue',
          type: ConditionType.StringValue
        }
      ],
      displayName: 'likes blue',
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567896'
    },
    {
      items: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567897',
          componentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          operator: OperatorName.Is,
          value: 'red',
          type: ConditionType.StringValue
        }
      ],
      displayName: 'likes red',
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567898'
    },
    {
      items: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567899',
          componentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          operator: OperatorName.Is,
          value: 'green',
          type: ConditionType.StringValue
        }
      ],
      displayName: 'likes green',
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567900'
    },
    {
      items: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567901',
          componentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892',
          operator: OperatorName.Is,
          value: 'developer',
          type: ConditionType.StringValue
        }
      ],
      displayName: 'is developer',
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567902'
    },
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
    },
    {
      id: '8014492b-9621-4886-8942-75c895cca16e',
      displayName: 'is Bob AND born on 01/01/2001',
      coordinator: Coordinator.AND,
      items: [
        {
          id: 'f64e1ed2-bf39-46ad-a7e9-2a34c02f3d62',
          conditionId: '2ff0c205-9421-4816-94d5-b33851a42c88'
        },
        {
          id: 'd8eb7a4e-feed-41d6-8395-2776d1ccbbb7',
          conditionId: 'd15aff7a-6224-40a2-8e5f-51a5af2f7910'
        }
      ]
    },
    // likes blue OR likes red OR likes green
    {
      id: '27380e0d-1257-4400-ba45-26e66f2770fb',
      displayName: 'likes blue OR red OR green',
      coordinator: Coordinator.OR,
      items: [
        {
          id: 'd53aa916-1888-4912-a9cf-bf9171608a77',
          conditionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567896'
        },
        {
          id: 'b1c94baa-7e7e-45d1-b06a-f76776fcf5d2',
          conditionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567898'
        },
        {
          id: 'ae1b994b-fe51-4449-a298-1115ca34be98',
          conditionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567900'
        }
      ]
    },
    // (is Bob AND born on 01/01/2001) AND (likes blue OR red OR green)
    {
      displayName:
        '(is Bob AND born 01/01/2001) AND (likes blue OR red OR green)',
      coordinator: Coordinator.AND,
      items: [
        {
          id: '3c57d6a0-7154-47b3-b28f-9ff13084547e',
          conditionId: '8014492b-9621-4886-8942-75c895cca16e'
        },
        {
          id: '10d3d15b-f254-4331-b5cf-4f6e64cf0677',
          conditionId: '27380e0d-1257-4400-ba45-26e66f2770fb'
        }
      ],
      id: '0f545894-a0f4-4d77-a000-d2833cc113d8'
    },
    // (is Bob OR over 18 OR (is Bob AND over 18)) OR is developer
    {
      displayName:
        '(is Bob OR over 18 OR (is Bob AND over 18)) OR is developer',
      coordinator: Coordinator.OR,
      items: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567903',
          conditionId: 'd15aff7a-6224-40a2-8e5f-51a5af2f7910'
        },
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567904',
          conditionId: 'd1f9fcc7-f098-47e7-9d31-4f5ee57ba985'
        },
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567905',
          conditionId: 'db43c6bc-9ce6-478b-8345-4fff5eff2ba3'
        },
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567906',
          conditionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567902'
        }
      ],
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567894'
    }
  ],
  lists: [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567907',
      title: 'Color options',
      name: 'colorList',
      type: 'string',
      items: [
        { text: 'Blue', value: 'blue' },
        { text: 'Red', value: 'red' },
        { text: 'Green', value: 'green' },
        { text: 'Yellow', value: 'yellow' },
        { text: 'Purple', value: 'purple' }
      ]
    }
  ],
  sections: []
})
