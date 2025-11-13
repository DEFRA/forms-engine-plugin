import { ComponentType, type LatLongFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type LatLongField } from '~/src/server/plugins/engine/components/LatLongField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'

describe('LocationFieldHelpers', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('getLocationFieldViewModel', () => {
    it('should return view model with fieldset', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: 51.5,
        myComponent__longitude: -0.1
      }

      const viewModel = field.getViewModel(payload)

      expect(viewModel.fieldset).toEqual({
        legend: {
          text: def.title,
          classes: 'govuk-fieldset__legend--m'
        }
      })

      expect(viewModel.items).toHaveLength(2)
    })

    it('should include instruction text in view model when provided', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {
          instructionText: 'Enter coordinates in decimal format'
        },
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: 51.5,
        myComponent__longitude: -0.1
      }

      const viewModel = field.getViewModel(payload)

      const instructionText =
        'instructionText' in viewModel ? viewModel.instructionText : undefined
      expect(instructionText).toBeTruthy()
      expect(instructionText).toContain('decimal format')
    })

    it('should handle component-level errors correctly', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: '',
        myComponent__longitude: ''
      }

      const errors = [
        {
          name: 'myComponent',
          text: 'Error message',
          path: ['myComponent'],
          href: '#myComponent'
        }
      ]

      const viewModel = field.getViewModel(payload, errors)

      // Check that errors are passed to the viewModel
      expect(viewModel.errors).toEqual(errors)
      expect(viewModel.showFieldsetError).toBe(true)

      // Items should still have their structure
      expect(viewModel.items[0]).toEqual(
        expect.objectContaining({
          id: 'myComponent__latitude',
          name: 'myComponent__latitude'
        })
      )

      expect(viewModel.items[1]).toEqual(
        expect.objectContaining({
          id: 'myComponent__longitude',
          name: 'myComponent__longitude'
        })
      )
    })

    it('should display single errors at fieldset level', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: 'invalid',
        myComponent__longitude: '-0.1'
      }

      const errors = [
        {
          name: 'myComponent__latitude',
          text: 'Invalid latitude',
          path: ['myComponent__latitude'],
          href: '#myComponent__latitude'
        }
      ]

      const viewModel = field.getViewModel(payload, errors)

      // Single errors should be displayed at fieldset level
      expect(viewModel.items[0].errorMessage).toBeUndefined()
      expect(viewModel.items[1].errorMessage).toBeUndefined()

      expect(viewModel.errorMessage).toEqual({
        text: 'Invalid latitude'
      })

      expect(viewModel.showFieldsetError).toBe(true)

      // Error styling should be applied to the field with error
      expect(viewModel.items[0].classes).toContain('govuk-input--error')
    })

    it('should display multiple errors as combined message at fieldset level', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: '',
        myComponent__longitude: ''
      }

      const errors = [
        {
          name: 'myComponent__latitude',
          text: 'Enter latitude',
          path: ['myComponent__latitude'],
          href: '#myComponent__latitude'
        },
        {
          name: 'myComponent__longitude',
          text: 'Enter longitude',
          path: ['myComponent__longitude'],
          href: '#myComponent__longitude'
        }
      ]

      const viewModel = field.getViewModel(payload, errors)

      expect(viewModel.items[0].errorMessage).toBeUndefined()
      expect(viewModel.items[1].errorMessage).toBeUndefined()

      expect(viewModel.errorMessage).toEqual({
        text: 'Enter latitude and Enter longitude'
      })
      expect(viewModel.showFieldsetError).toBe(true)

      expect(viewModel.items[0].classes).toContain('govuk-input--error')
      expect(viewModel.items[1].classes).toContain('govuk-input--error')
    })

    it('should show fieldset error when viewModel has error but no field errors', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: '51.5',
        myComponent__longitude: '-0.1'
      }

      // Parent component error, not field-level
      const errors = [
        {
          name: 'myComponent',
          text: 'Location is required',
          path: ['myComponent'],
          href: '#myComponent'
        }
      ]

      const viewModel = field.getViewModel(payload, errors)

      // No individual field errors
      expect(viewModel.items[0].errorMessage).toBeUndefined()
      expect(viewModel.items[1].errorMessage).toBeUndefined()

      // But fieldset error should still be shown
      expect(viewModel.showFieldsetError).toBe(true)
      expect(viewModel.errorMessage).toEqual({
        text: 'Location is required'
      })

      // No error styling on inputs when no field errors
      expect(viewModel.items[0].classes).not.toContain('govuk-input--error')
      expect(viewModel.items[1].classes).not.toContain('govuk-input--error')
    })

    it('should handle labels correctly in view model items', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: '51.5',
        myComponent__longitude: '-0.1'
      }

      const viewModel = field.getViewModel(payload)

      const label = viewModel.items[0].label
      expect(label).toBeDefined()
      expect(label?.text).toBe('Latitude')

      const labelString =
        label && 'toString' in label && typeof label.toString === 'function'
          ? (label as { toString: () => string }).toString()
          : ''
      expect(labelString).toBe('Latitude')
    })

    it('should use existing fieldset if provided', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })
      const field = collection.fields[0] as LatLongField

      const payload = {
        myComponent__latitude: 51.5,
        myComponent__longitude: -0.1
      }

      const viewModel = field.getViewModel(payload)

      expect(viewModel.fieldset).toBeDefined()
    })
  })

  describe('createLocationFieldValidator', () => {
    it('should return error when required field is empty', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })

      const payload = {
        myComponent__latitude: '',
        myComponent__longitude: ''
      }

      const result = collection.validate(payload)

      expect(result.errors).toBeTruthy()
      expect(result.errors?.length).toBeGreaterThan(0)
    })

    it('should return error when required field has invalid state', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {
          required: true
        },
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })

      const payload = {
        myComponent__latitude: 'not_a_number',
        myComponent__longitude: 'also_not_a_number'
      }

      const result = collection.validate(payload)

      expect(result.errors).toBeTruthy()
    })

    it('should not return error when optional field is empty', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {
          required: false
        },
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })

      const payload = {
        myComponent__latitude: '',
        myComponent__longitude: ''
      }

      const result = collection.validate(payload)

      expect(result.errors).toBeUndefined()
    })

    it('should return error when required field is partially filled', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })

      const payload = {
        myComponent__latitude: '51.5',
        myComponent__longitude: ''
      }

      const result = collection.validate(payload)

      expect(result.errors).toBeTruthy()
    })

    it('should not return error when all required fields are filled', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })

      const payload = {
        myComponent__latitude: '51.5',
        myComponent__longitude: '-0.1'
      }

      const result = collection.validate(payload)

      expect(result.errors).toBeUndefined()
    })

    it('should validate optional fields correctly when partially filled', () => {
      const def: LatLongFieldComponent = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {
          required: false
        },
        schema: {}
      }

      const collection = new ComponentCollection([def], { model })

      const payload = {
        myComponent__latitude: '51.5',
        myComponent__longitude: ''
      }

      const result = collection.validate(payload)

      expect(result.errors).toBeTruthy()
      expect(result.errors?.length).toBeGreaterThan(0)
    })
  })
})
