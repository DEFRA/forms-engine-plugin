import { type ComponentDef } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/basic.js'

const formModel = new FormModel(definition, {
  basePath: 'test'
})

describe('helpers tests', () => {
  test('should throw if invalid type', () => {
    expect(() =>
      createComponent(
        {
          type: 'invalid-type'
        } as unknown as ComponentDef,
        {
          model: formModel
        }
      )
    ).toThrow('Component type invalid-type does not exist')
  })
})

describe('ComponentBase tests', () => {
  test('should handle save and exit functionality', () => {
    const mockComponentDef = {
      type: 'TextField',
      name: 'testField',
      title: 'Test Field'
    } as ComponentDef

    const component = new ComponentBase(mockComponentDef, { model: formModel })

    expect(component.name).toBe('testField')
    expect(component.title).toBe('Test Field')
    expect(component.type).toBe('TextField')
  })

  test('should handle context correctly', () => {
    const mockComponentDef = {
      type: 'TextField',
      name: 'contextField',
      title: 'Context Field'
    } as ComponentDef

    const component = new ComponentBase(mockComponentDef, { model: formModel })

    expect(component.model).toBe(formModel)
    expect(component.name).toBe('contextField')
    expect(component.title).toBe('Context Field')
  })
})
