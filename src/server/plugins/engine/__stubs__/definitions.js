import {
  ComponentType,
  ConditionType,
  ControllerType,
  Engine,
  OperatorName,
  SchemaVersion
} from '@defra/forms-model'

const YES_NO_COMPONENT_ID = 'a7c0242f-2a31-45b2-8c71-ff2ac7f53288'
const USER_TYPE_LIST_ID = '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544'
const EXISTING_USER_ITEM_ID = '55fe0067-d011-4d33-886c-e1aa266637c3'

/**
 * A minimal, schema-valid V2 definition: one YesNo question page and a
 * summary page. Each call returns a fresh object, so tests can mutate their
 * copy freely without affecting each other.
 * @returns {FormDefinition}
 */
export function buildDefinition() {
  return {
    name: 'Stub definition',
    engine: Engine.V2,
    schema: SchemaVersion.V2,
    startPage: '/summary',
    pages: [
      {
        id: '449c053b-9201-4312-9a75-187afc6ba48b',
        path: '/licence',
        title: 'Licence',
        components: [
          {
            id: YES_NO_COMPONENT_ID,
            name: 'xVrYaJ',
            type: ComponentType.YesNoField,
            title: 'Do you have a licence?',
            shortDescription: 'Licence',
            options: { required: true }
          }
        ],
        next: []
      },
      {
        id: '449c053b-9201-4312-9a75-187afc6ba48c',
        path: '/summary',
        title: 'Summary',
        controller: ControllerType.Summary,
        components: []
      }
    ],
    lists: [],
    sections: [],
    conditions: []
  }
}

/**
 * A definition that passes schema validation but cannot be used by the
 * engine: a ListItemRef condition points at the YesNoField (boolean), so the
 * condition expression builder produces an unparseable expression. Distilled
 * from a real production incident.
 * @returns {FormDefinition}
 */
export function buildBrokenConditionDefinition() {
  const definition = buildDefinition()

  definition.name = 'Broken condition fixture'

  const questionPage = /** @type {PageQuestion} */ (definition.pages[0])
  // A YesNoField cannot legitimately carry a custom list — that is the
  // corruption this fixture models — so the TS component types (rightly)
  // have no `list` property here and a cast is required.
  const component = /** @type {{ list?: string }} */ (
    questionPage.components[0]
  )
  component.list = USER_TYPE_LIST_ID
  definition.lists = [
    {
      id: USER_TYPE_LIST_ID,
      name: 'XtfRYR',
      title: 'User type list',
      type: 'string',
      items: [
        {
          id: EXISTING_USER_ITEM_ID,
          text: 'existing user',
          value: 'existing user'
        },
        {
          id: '2277c7e5-7fef-46c6-993b-d294116d6d6b',
          text: 'new user',
          value: 'new user'
        }
      ]
    }
  ]
  definition.conditions = [
    {
      id: '3f9d3a35-6dee-4706-806c-3f776129f631',
      displayName: 'Existing user',
      items: [
        {
          id: '7d7f58ee-c860-4d24-8a13-de5cb9af53d8',
          componentId: YES_NO_COMPONENT_ID,
          operator: OperatorName.Is,
          type: ConditionType.ListItemRef,
          value: {
            listId: USER_TYPE_LIST_ID,
            itemId: [EXISTING_USER_ITEM_ID]
          }
        }
      ]
    }
  ]

  return definition
}

/**
 * A schema-valid definition whose first page names a controller that is
 * neither built in nor registered by the host application.
 * @returns {FormDefinition}
 */
export function buildUnknownControllerDefinition() {
  const definition = buildDefinition()

  definition.name = 'Unknown controller fixture'
  definition.pages[0].controller = /** @type {ControllerType} */ (
    /** @type {unknown} */ ('NoSuchPageController')
  )

  return definition
}

/**
 * Schema-valid (component types are free strings in the schema), but the
 * question uses a type the engine has no component class for.
 * @returns {FormDefinition}
 */
export function buildUnknownComponentDefinition() {
  const definition = buildDefinition()

  definition.name = 'Unknown component fixture'
  const questionPage = /** @type {PageQuestion} */ (definition.pages[0])
  questionPage.components[0].type = /** @type {ComponentType} */ (
    /** @type {unknown} */ ('MyUnknownField')
  )

  return definition
}

/**
 * A definition that fails schema validation: the question page appears
 * twice, violating the pages uniqueness rule.
 * @returns {FormDefinition}
 */
export function buildSchemaInvalidDefinition() {
  const definition = buildDefinition()

  definition.name = 'Schema invalid fixture'
  definition.pages.push(buildDefinition().pages[0])

  return definition
}

/**
 * @import { FormDefinition, PageQuestion } from '@defra/forms-model'
 */
