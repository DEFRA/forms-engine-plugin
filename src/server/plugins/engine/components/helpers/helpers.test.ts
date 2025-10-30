import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { EastingNorthingField } from '~/src/server/plugins/engine/components/EastingNorthingField.js'
import { LatLongField } from '~/src/server/plugins/engine/components/LatLongField.js'
import { NationalGridFieldNumberField } from '~/src/server/plugins/engine/components/NationalGridFieldNumberField.js'
import { OsGridRefField } from '~/src/server/plugins/engine/components/OsGridRefField.js'
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

  test('should create EastingNorthingField component', () => {
    const component = createComponent(
      {
        type: ComponentType.EastingNorthingField,
        name: 'testField',
        title: 'Test Easting Northing',
        options: {},
        schema: {}
      },
      { model: formModel }
    )

    expect(component).toBeInstanceOf(EastingNorthingField)
    expect(component.name).toBe('testField')
    expect(component.title).toBe('Test Easting Northing')
  })

  test('should create LatLongField component', () => {
    const component = createComponent(
      {
        type: ComponentType.LatLongField,
        name: 'testField',
        title: 'Test Lat Long',
        options: {},
        schema: {}
      },
      { model: formModel }
    )

    expect(component).toBeInstanceOf(LatLongField)
    expect(component.name).toBe('testField')
    expect(component.title).toBe('Test Lat Long')
  })

  test('should create OsGridRefField component', () => {
    const component = createComponent(
      {
        type: ComponentType.OsGridRefField,
        name: 'testField',
        title: 'Test OS Grid Ref',
        options: {}
      },
      { model: formModel }
    )

    expect(component).toBeInstanceOf(OsGridRefField)
    expect(component.name).toBe('testField')
    expect(component.title).toBe('Test OS Grid Ref')
  })

  test('should create NationalGridFieldNumberField component', () => {
    const component = createComponent(
      {
        type: ComponentType.NationalGridFieldNumberField,
        name: 'testField',
        title: 'Test National Grid',
        options: {}
      },
      { model: formModel }
    )

    expect(component).toBeInstanceOf(NationalGridFieldNumberField)
    expect(component.name).toBe('testField')
    expect(component.title).toBe('Test National Grid')
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
