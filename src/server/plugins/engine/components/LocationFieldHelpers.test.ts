import { ComponentType, type LatLongFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type LatLongField } from '~/src/server/plugins/engine/components/LatLongField.js'
import {
  deduplicateErrorsByHref,
  extractEnterFieldNames,
  formatErrorList,
  joinWithAnd,
  mergeCssClasses
} from '~/src/server/plugins/engine/components/LocationFieldHelpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormSubmissionError } from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/blank.js'

describe('LocationFieldHelpers', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('extractEnterFieldNames', () => {
    it('should return empty array for empty input', () => {
      expect(extractEnterFieldNames([])).toEqual([])
    })

    it('should return null for non-Enter messages', () => {
      expect(extractEnterFieldNames(['Select option'])).toBeNull()
    })

    it('should extract field name from single Enter message', () => {
      expect(extractEnterFieldNames(['Enter easting'])).toEqual(['easting'])
    })

    it('should extract field names from multiple Enter messages', () => {
      expect(
        extractEnterFieldNames(['Enter easting', 'Enter northing'])
      ).toEqual(['easting', 'northing'])
    })

    it('should return null if any message does not match pattern', () => {
      expect(
        extractEnterFieldNames(['Enter easting', 'Select option'])
      ).toBeNull()
    })
  })

  describe('joinWithAnd', () => {
    it('should join two items with "and"', () => {
      expect(joinWithAnd(['item1', 'item2'])).toBe('item1 and item2')
    })

    it('should join three items with commas and "and"', () => {
      expect(joinWithAnd(['item1', 'item2', 'item3'])).toBe(
        'item1, item2 and item3'
      )
    })

    it('should join four items with commas and "and"', () => {
      expect(joinWithAnd(['item1', 'item2', 'item3', 'item4'])).toBe(
        'item1, item2, item3 and item4'
      )
    })
  })

  describe('formatErrorList', () => {
    it('should return empty string for empty array', () => {
      expect(formatErrorList([])).toBe('')
    })

    it('should return single message without formatting', () => {
      expect(formatErrorList(['Error message'])).toBe('Error message')
    })

    it('should format two messages with "and"', () => {
      expect(formatErrorList(['First error', 'Second error'])).toBe(
        'First error and Second error'
      )
    })

    it('should format multiple messages with commas and "and"', () => {
      expect(formatErrorList(['Error 1', 'Error 2', 'Error 3'])).toBe(
        'Error 1, Error 2 and Error 3'
      )
    })

    it('should extract and format Enter messages', () => {
      expect(formatErrorList(['Enter easting', 'Enter northing'])).toBe(
        'Enter easting and enter northing'
      )
    })

    it('should extract and format three Enter messages', () => {
      expect(
        formatErrorList(['Enter Field1', 'Enter Field2', 'Enter Field3'])
      ).toBe('Enter Field1, enter Field2 and enter Field3')
    })

    it('should fallback to regular join for non-Enter messages', () => {
      expect(formatErrorList(['Select option1', 'Select option2'])).toBe(
        'Select option1 and Select option2'
      )
    })

    it('should not affect min/max/precision error messages', () => {
      expect(
        formatErrorList([
          'Latitude for location must be between 49.85 and 60.859',
          'Longitude for location must be between -13.687 and 1.767'
        ])
      ).toBe(
        'Latitude for location must be between 49.85 and 60.859 and Longitude for location must be between -13.687 and 1.767'
      )
    })

    it('should not affect mixed Enter and validation error messages', () => {
      expect(
        formatErrorList([
          'Enter latitude',
          'Longitude for location must be between -13.687 and 1.767'
        ])
      ).toBe(
        'Enter latitude and Longitude for location must be between -13.687 and 1.767'
      )
    })

    it('should handle precision error messages without modification', () => {
      expect(
        formatErrorList([
          'Latitude must have no more than 7 decimal places',
          'Longitude must have no more than 7 decimal places'
        ])
      ).toBe(
        'Latitude must have no more than 7 decimal places and Longitude must have no more than 7 decimal places'
      )
    })
  })

  describe('deduplicateErrorsByHref', () => {
    it('should return undefined for undefined input', () => {
      expect(deduplicateErrorsByHref(undefined)).toBeUndefined()
    })

    it('should return undefined for empty array', () => {
      expect(deduplicateErrorsByHref([])).toBeUndefined()
    })

    it('should return single error unchanged', () => {
      const error: FormSubmissionError = {
        name: 'field1',
        path: ['field1'],
        href: '#field1',
        text: 'Error message'
      }
      expect(deduplicateErrorsByHref([error])).toEqual([error])
    })

    it('should deduplicate errors with same href', () => {
      const error1: FormSubmissionError = {
        name: 'field1',
        path: ['field1'],
        href: '#field1',
        text: 'Error 1'
      }
      const error2: FormSubmissionError = {
        name: 'field1',
        path: ['field1'],
        href: '#field1',
        text: 'Error 2'
      }
      const result = deduplicateErrorsByHref([error1, error2])
      expect(result).toHaveLength(1)
      expect(result?.[0]).toBe(error1) // Should keep first occurrence
    })

    it('should keep errors with different hrefs', () => {
      const error1: FormSubmissionError = {
        name: 'field1',
        path: ['field1'],
        href: '#field1',
        text: 'Error 1'
      }
      const error2: FormSubmissionError = {
        name: 'field2',
        path: ['field2'],
        href: '#field2',
        text: 'Error 2'
      }
      const result = deduplicateErrorsByHref([error1, error2])
      expect(result).toHaveLength(2)
      expect(result).toEqual([error1, error2])
    })

    it('should deduplicate multiple errors with same href', () => {
      const error1: FormSubmissionError = {
        name: 'field1',
        path: ['field1'],
        href: '#field1',
        text: 'Error 1'
      }
      const error2: FormSubmissionError = {
        name: 'field1',
        path: ['field1'],
        href: '#field1',
        text: 'Error 2'
      }
      const error3: FormSubmissionError = {
        name: 'field2',
        path: ['field2'],
        href: '#field2',
        text: 'Error 3'
      }
      const error4: FormSubmissionError = {
        name: 'field1',
        path: ['field1'],
        href: '#field1',
        text: 'Error 4'
      }
      const result = deduplicateErrorsByHref([error1, error2, error3, error4])
      expect(result).toHaveLength(2)
      expect(result?.[0]).toBe(error1) // First occurrence of #field1
      expect(result?.[1]).toBe(error3) // #field2
    })
  })

  describe('mergeCssClasses', () => {
    it('should return undefined for no arguments', () => {
      expect(mergeCssClasses()).toBeUndefined()
    })

    it('should return undefined for all undefined arguments', () => {
      expect(mergeCssClasses(undefined, undefined)).toBeUndefined()
    })

    it('should return undefined for empty strings', () => {
      expect(mergeCssClasses('', '   ', '')).toBeUndefined()
    })

    it('should return single class', () => {
      expect(mergeCssClasses('class1')).toBe('class1')
    })

    it('should merge multiple classes', () => {
      expect(mergeCssClasses('class1', 'class2')).toBe('class1 class2')
    })

    it('should deduplicate classes', () => {
      expect(mergeCssClasses('class1', 'class2 class1')).toBe('class1 class2')
    })

    it('should handle undefined mixed with classes', () => {
      expect(mergeCssClasses('class1', undefined, 'class2')).toBe(
        'class1 class2'
      )
    })

    it('should handle multiple spaces in class strings', () => {
      expect(mergeCssClasses('class1  class2', '  class3')).toBe(
        'class1 class2 class3'
      )
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
        text: 'Enter latitude and enter longitude'
      })
      expect(viewModel.showFieldsetError).toBe(true)

      expect(viewModel.items[0].classes).toContain('govuk-input--error')
      expect(viewModel.items[1].classes).toContain('govuk-input--error')
    })

    it('should preserve individual error messages when no field errors exist', () => {
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

      // No errors passed in, but the subViewModels might have errors from elsewhere
      const viewModel = field.getViewModel(payload, [])

      // When no field errors, items should not have error messages
      expect(viewModel.items[0].errorMessage).toBeUndefined()
      expect(viewModel.items[1].errorMessage).toBeUndefined()

      // No fieldset error when there are no field errors
      expect(viewModel.showFieldsetError).toBe(false)
      expect(viewModel.errorMessage).toBeUndefined()

      // No error styling when no field errors
      expect(viewModel.items[0].classes).not.toContain('govuk-input--error')
      expect(viewModel.items[1].classes).not.toContain('govuk-input--error')
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

    it('should handle classes with undefined base classes correctly', () => {
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

      // When no errors and no additional classes, classes should not include govuk-input--error
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
