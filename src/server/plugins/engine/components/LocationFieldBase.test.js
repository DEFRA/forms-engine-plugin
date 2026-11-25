import { ComponentType } from '@defra/forms-model'

import { LocationFieldBase } from '~/src/server/plugins/engine/components/LocationFieldBase.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData } from '~/test/helpers/component-helpers.js'

class TestLocationField extends LocationFieldBase {
  /**
   * @protected
   * @param {Translator} _translator
   */
  getValidationConfig(_translator) {
    return {
      pattern: /^TEST\d{4}$/i,
      patternErrorMessage: 'Enter a valid test code like TEST1234',
      requiredMessage: 'Enter a test code',
      additionalMessages: /** @type {LanguageMessages} */ ({
        'string.custom': 'This is a custom error from additional messages'
      }),
      customValidation: (
        /** @type {string} */ value,
        /** @type {CustomHelpers} */ helpers
      ) => {
        if (value === 'FAIL0000') {
          return helpers.error('string.custom')
        }
        return value
      }
    }
  }

  /**
   * @protected
   */
  getErrorTemplates() {
    return [
      {
        type: 'pattern',
        template: 'Enter a valid test code for [description] like TEST1234'
      },
      {
        type: 'custom',
        template: 'This is a custom error template'
      }
    ]
  }
}

describe('LocationFieldBase', () => {
  /** @type {FormModel} */
  let model

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('customValidationMessage with additionalMessages', () => {
    it('should merge custom validation message with additional message keys', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            customValidationMessage: 'This is a unified custom error'
          },
          schema: {}
        })

      const field = new TestLocationField(def, { model })

      const result2 = field.formSchema.validate('INVALID')
      const result3 = field.formSchema.validate('FAIL0000')

      expect(result2.error?.message).toBe('This is a unified custom error')
      expect(result3.error?.message).toBe('This is a unified custom error')
    })
  })

  describe('getViewModel with instructionText', () => {
    it('should include parsed markdown instruction text', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            instructionText: 'This is **bold** text'
          },
          schema: {}
        })

      const field = new TestLocationField(def, { model })
      const viewModel = field.getViewModel({
        payload: getFormData('TEST1234'),
        translator: stubTranslator
      })

      const instructionText =
        'instructionText' in viewModel ? viewModel.instructionText : undefined
      expect(instructionText).toBeTruthy()
      expect(instructionText).toContain('bold')
    })

    it('should not include instructionText when not provided', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        })

      const field = new TestLocationField(def, { model })
      const viewModel = field.getViewModel({
        payload: getFormData('TEST1234'),
        translator: stubTranslator
      })

      expect(
        'instructionText' in viewModel ? viewModel.instructionText : undefined
      ).toBeUndefined()
    })
  })

  describe('getAllPossibleErrors', () => {
    it('should return base errors with custom error templates', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        })

      const field = new TestLocationField(def, { model })
      const errors = field.getAllPossibleErrors()

      expect(errors.baseErrors).toHaveLength(3)
      expect(errors.baseErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'required' }),
          expect.objectContaining({ type: 'pattern' }),
          expect.objectContaining({ type: 'custom' })
        ])
      )
      expect(errors.advancedSettingsErrors).toEqual([])
    })
  })

  describe('isValue and getFormValue', () => {
    it('should correctly identify string values', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        })

      const field = new TestLocationField(def, { model })

      expect(field.isValue('TEST1234')).toBe(true)
      expect(field.isValue('')).toBe(false)
      expect(field.isValue(null)).toBe(false)
      expect(field.isValue(undefined)).toBe(false)
      expect(field.isValue(123)).toBe(false)
      expect(field.isValue({ test: 'value' })).toBe(false)
    })

    it('should return value when it is a non-empty string', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        })

      const field = new TestLocationField(def, { model })

      expect(field.getFormValue('TEST1234')).toBe('TEST1234')
      expect(field.getFormValue('')).toBeUndefined()
      expect(field.getFormValue(null)).toBeUndefined()
      expect(field.getFormValue(undefined)).toBeUndefined()
    })

    it('should get value from state', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        })

      const field = new TestLocationField(def, { model })

      const state1 = { myComponent: 'TEST1234' }
      const state2 = { myComponent: null }
      const state3 = { myComponent: '' }

      expect(field.getFormValueFromState(state1)).toBe('TEST1234')
      expect(field.getFormValueFromState(state2)).toBeUndefined()
      expect(field.getFormValueFromState(state3)).toBeUndefined()
    })
  })

  describe('optional field validation', () => {
    it('should allow empty values when required is false', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            required: false
          },
          schema: {}
        })

      const field = new TestLocationField(def, { model })
      const result = field.formSchema.validate('')

      expect(result.error).toBeUndefined()
      expect(result.value).toBe('')
    })

    it('should validate pattern even for optional fields when value is provided', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            required: false
          },
          schema: {}
        })

      const field = new TestLocationField(def, { model })
      const result = field.formSchema.validate('INVALID')

      expect(result.error).toBeDefined()
    })
  })

  describe('customValidationMessages', () => {
    it('should use custom validation messages when provided', () => {
      const def =
        /** @type {ConstructorParameters<typeof TestLocationField>[0]} */ ({
          title: 'Test location field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            customValidationMessages: {
              'string.pattern.base': 'Custom pattern error message',
              'string.custom': 'Custom error message'
            }
          },
          schema: {}
        })

      const field = new TestLocationField(def, { model })
      const result = field.formSchema.validate('INVALID')

      expect(result.error?.message).toBe('Custom pattern error message')
    })
  })
})

/**
 * @import { CustomHelpers, LanguageMessages } from 'joi'
 * @import { Translator } from '~/src/server/plugins/engine/types/index.js'
 */
