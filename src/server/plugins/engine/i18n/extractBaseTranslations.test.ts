import {
  ComponentType,
  SchemaVersion,
  type FormDefinition
} from '@defra/forms-model'

import { extractBaseTranslations } from '~/src/server/plugins/engine/i18n/extractBaseTranslations.js'

const pageId = 'b2c3d4e5-0001-0000-0000-000000000000'
const componentId = 'c3d4e5f6-0001-0000-0000-000000000000'
const sectionId = 'a1b2c3d4-0001-0000-0000-000000000000'
const listItemId = 'e5f6a7b8-0001-0000-0000-000000000000'

const def = {
  schema: SchemaVersion.V2,
  engine: 'V2' as const,
  name: 'Test form',
  pages: [
    {
      id: pageId,
      path: '/personal-details',
      title: 'Your personal details',
      section: sectionId,
      components: [
        {
          id: componentId,
          type: ComponentType.TextField,
          name: 'firstName',
          title: 'First name',
          hint: 'As it appears on your licence',
          shortDescription: 'Name',
          schema: {},
          options: {}
        }
      ]
    }
  ],
  lists: [
    {
      id: 'listId',
      name: 'duration',
      title: 'Duration',
      type: 'string' as const,
      items: [{ id: listItemId, text: '1 day', value: '1' }]
    }
  ],
  sections: [
    {
      id: sectionId,
      name: 'personal',
      title: 'Personal details',
      hideTitle: false
    }
  ],
  conditions: [],
  startPage: '/personal-details'
} as unknown as FormDefinition

describe('extractBaseTranslations', () => {
  it('extracts page titles', () => {
    const result = extractBaseTranslations(def)
    expect(result.pages[pageId]).toEqual({ title: 'Your personal details' })
  })

  it('extracts component title, hint and shortDescription', () => {
    const result = extractBaseTranslations(def)
    expect(result.components[componentId]).toEqual({
      title: 'First name',
      hint: 'As it appears on your licence',
      shortDescription: 'Name'
    })
  })

  it('extracts section titles', () => {
    const result = extractBaseTranslations(def)
    expect(result.sections[sectionId]).toEqual({ title: 'Personal details' })
  })

  it('extracts list item text', () => {
    const result = extractBaseTranslations(def)
    expect(result.listItems[listItemId]).toEqual({ text: '1 day' })
  })

  it('skips pages without an id', () => {
    const defNoId = {
      ...def,
      pages: [{ ...def.pages[0], id: undefined }]
    } as unknown as FormDefinition
    const result = extractBaseTranslations(defNoId)
    expect(Object.keys(result.pages)).toHaveLength(0)
  })

  it('skips components without an id', () => {
    interface PageWithComponents { components: Record<string, unknown>[] }
    const firstPage = def.pages[0] as unknown as PageWithComponents
    const defNoId = {
      ...def,
      pages: [
        {
          ...def.pages[0],
          components: [{ ...firstPage.components[0], id: undefined }]
        }
      ]
    } as unknown as FormDefinition
    const result = extractBaseTranslations(defNoId)
    expect(Object.keys(result.components)).toHaveLength(0)
  })
})
