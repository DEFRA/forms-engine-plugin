import {
  ComponentType,
  type NationalGridFieldNumberFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { NationalGridFieldNumberField } from '~/src/server/plugins/engine/components/NationalGridFieldNumberField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('NationalGridFieldNumberField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: NationalGridFieldNumberFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example National Grid field number',
        name: 'myComponent',
        type: ComponentType.NationalGridFieldNumberField,
        options: {}
      }

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses component title as label as default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'Example National Grid field number'
            })
          })
        )
      })

      it('uses component name as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual(['myComponent'])
        expect(field.collection).toBeUndefined()

        for (const key of field.keys) {
          expect(keys).toHaveProperty(key)
        }
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              presence: 'required'
            })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [{ ...def, options: { required: false } }],
          { model }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({ allow: [''] })
        )

        const result = collectionOptional.validate(getFormData(''))
        expect(result.errors).toBeUndefined()
      })

      it('accepts valid values', () => {
        // Test 8-digit parcel ID format (2x4)
        const result1 = collection.validate(getFormData('TQ12345678'))
        const result2 = collection.validate(getFormData('TQ 1234 5678'))

        // Test 10-digit OS grid reference format (2x5)
        const result3 = collection.validate(getFormData('SU1234567890'))
        const result4 = collection.validate(getFormData('SU 12345 67890'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
        expect(result3.errors).toBeUndefined()
        expect(result4.errors).toBeUndefined()

        // Test case-insensitive
        const result5 = collection.validate(getFormData('nt12345678'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
        expect(result3.errors).toBeUndefined()
        expect(result4.errors).toBeUndefined()
        expect(result5.errors).toBeUndefined()
      })

      it('formats values with spaces per GDS guidance', () => {
        const result1 = collection.validate(getFormData('NG 1234 5678'))
        const result2 = collection.validate(getFormData('NG12345678'))
        const result3 = collection.validate(getFormData('NG12345,678'))

        expect(result1.value.myComponent).toBe('NG 1234 5678')
        expect(result2.value.myComponent).toBe('NG12345678')
        expect(result3.value.myComponent).toBe('NG12345,678')
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example National Grid field number'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData('NG1234567'))
        const result2 = collection.validate(getFormData('N123456789'))
        const result3 = collection.validate(getFormData('NGABCDEFGH'))

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
        expect(result3.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState('NG12345678')
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('NG12345678')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('NG12345678')
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('NG12345678'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('NG12345678')
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe('NG12345678')
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState('NG12345678')
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe('NG12345678')
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('NG12345678')
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('NG12345678'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData('NG12345678'))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'NG12345678'
          })
        )
      })

      it('includes instruction text when provided', () => {
        const componentWithInstruction = new NationalGridFieldNumberField(
          {
            ...def,
            options: { instructionText: 'Enter in format **NG12345678**' }
          },
          { model }
        )

        const viewModel = componentWithInstruction.getViewModel(
          getFormData('NG12345678')
        )

        const instructionText =
          'instructionText' in viewModel ? viewModel.instructionText : undefined
        expect(instructionText).toBeTruthy()
        expect(instructionText).toContain('NG12345678')
      })
    })

    describe('AllPossibleErrors', () => {
      it('should return errors from instance method', () => {
        const errors = field.getAllPossibleErrors()
        expect(errors.baseErrors).not.toBeEmpty()
        expect(errors.advancedSettingsErrors).toEqual([])
      })

      it('should return errors from static method', () => {
        const staticErrors = NationalGridFieldNumberField.getAllPossibleErrors()
        expect(staticErrors.baseErrors).not.toBeEmpty()
        expect(staticErrors.advancedSettingsErrors).toEqual([])
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example National Grid field number',
          name: 'myComponent',
          type: ComponentType.NationalGridFieldNumberField,
          options: {}
        },
        assertions: [
          {
            input: getFormData('  NG12345678'),
            output: { value: getFormData('NG12345678') }
          },
          {
            input: getFormData('NG12345678  '),
            output: { value: getFormData('NG12345678') }
          },
          {
            input: getFormData('  NG12345678 \n\n'),
            output: { value: getFormData('NG12345678') }
          }
        ]
      },
      {
        description: 'Pattern validation',
        component: {
          title: 'Example National Grid field number',
          name: 'myComponent',
          type: ComponentType.NationalGridFieldNumberField,
          options: {}
        },
        assertions: [
          {
            input: getFormData('NG1234567'),
            output: {
              value: getFormData('NG1234567'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Enter a valid National Grid field number for Example National Grid field number like NG 1234 5678'
                })
              ])
            }
          },
          {
            input: getFormData('N123456789'),
            output: {
              value: getFormData('N123456789'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Enter a valid National Grid field number for Example National Grid field number like NG 1234 5678'
                })
              ])
            }
          },
          {
            input: getFormData('NGABCDEFGH'),
            output: {
              value: getFormData('NGABCDEFGH'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Enter a valid National Grid field number for Example National Grid field number like NG 1234 5678'
                })
              ])
            }
          }
        ]
      },
      {
        description: 'Custom validation message',
        component: {
          title: 'Example National Grid field number',
          name: 'myComponent',
          type: ComponentType.NationalGridFieldNumberField,
          options: {
            customValidationMessage: 'This is a custom error'
          }
        },
        assertions: [
          {
            input: getFormData(''),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          },
          {
            input: getFormData('INVALID'),
            output: {
              value: getFormData('INVALID'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ])
            }
          }
        ]
      },
      {
        description: 'Custom validation messages (multiple)',
        component: {
          title: 'Example National Grid field number',
          name: 'myComponent',
          type: ComponentType.NationalGridFieldNumberField,
          options: {
            customValidationMessages: {
              'any.required': 'This is a custom required error',
              'string.empty': 'This is a custom empty string error',
              'string.pattern.base': 'This is a custom pattern error'
            }
          }
        },
        assertions: [
          {
            input: getFormData(),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom required error'
                })
              ]
            }
          },
          {
            input: getFormData(''),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom empty string error'
                })
              ]
            }
          },
          {
            input: getFormData('INVALID'),
            output: {
              value: getFormData('INVALID'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'This is a custom pattern error'
                })
              ])
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example National Grid field number',
          name: 'myComponent',
          type: ComponentType.NationalGridFieldNumberField,
          options: {
            required: false
          }
        },
        assertions: [
          {
            input: getFormData(''),
            output: { value: getFormData('') }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let collection: ComponentCollection

      beforeEach(() => {
        collection = new ComponentCollection(
          [def as NationalGridFieldNumberFieldComponent],
          { model }
        )
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const result = collection.validate(input)
          expect(result).toEqual(output)
        }
      )
    })
  })
})
