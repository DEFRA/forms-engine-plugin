import { ComponentType, type OsGridRefFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { OsGridRefField } from '~/src/server/plugins/engine/components/OsGridRefField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('OsGridRefField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: OsGridRefFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example OS grid reference',
        name: 'myComponent',
        type: ComponentType.OsGridRefField,
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
              label: 'Example OS grid reference'
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
        // Test 6-digit format (common OS grid reference)
        const result1 = collection.validate(getFormData('SD865005'))
        const result2 = collection.validate(getFormData('SD 865 005'))

        // Test case-insensitive
        const result3 = collection.validate(getFormData('nt123456'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
        expect(result3.errors).toBeUndefined()
      })

      it('retains values with spaces per GDS guidance', () => {
        const result1 = collection.validate(getFormData('SD865005'))
        const result2 = collection.validate(getFormData('TQ 1234 5678'))
        const result3 = collection.validate(getFormData('SU1234567890'))
        const result4 = collection.validate(getFormData('TQ12345678'))

        expect(result1.value.myComponent).toBe('SD865005')
        expect(result2.value.myComponent).toBe('TQ 1234 5678')
        expect(result3.value.myComponent).toBe('SU1234567890')
        expect(result4.value.myComponent).toBe('TQ12345678')
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example OS grid reference'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData('INVALID'))
        const result2 = collection.validate(getFormData('TQ12345')) // Wrong number of digits (5)
        const result3 = collection.validate(getFormData('AA12345678')) // Invalid letter combination
        const result4 = collection.validate(getFormData('TQ1234567')) // Wrong number of digits (7)

        // Test mismatched digit counts (must be either 3+3, 4+4 or 5+5, not mixed)
        const result5 = collection.validate(getFormData('SN 4444 55555')) // mismatched digit counts
        const result6 = collection.validate(getFormData('SN 55555 4444')) // mismatched digit counts

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
        expect(result3.errors).toBeTruthy()
        expect(result4.errors).toBeTruthy()
        expect(result5.errors).toBeTruthy()
        expect(result6.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState('TQ12345678')
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('TQ12345678')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('TQ12345678')
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('TQ12345678'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('TQ12345678')
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe('TQ12345678')
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState('TQ12345678')
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe('TQ12345678')
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('TQ12345678')
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('TQ12345678'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData('TQ12345678'))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'TQ12345678'
          })
        )
      })

      it('includes instruction text when provided', () => {
        const componentWithInstruction = new OsGridRefField(
          {
            ...def,
            options: { instructionText: 'Enter in format **TQ12345678**' }
          },
          { model }
        )

        const viewModel = componentWithInstruction.getViewModel(
          getFormData('TQ12345678')
        )

        const instructionText =
          'instructionText' in viewModel ? viewModel.instructionText : undefined
        expect(instructionText).toBeTruthy()
        expect(instructionText).toContain('TQ12345678')
      })
    })

    describe('AllPossibleErrors', () => {
      it('should return errors from instance method', () => {
        const errors = field.getAllPossibleErrors()
        expect(errors.baseErrors).not.toBeEmpty()
        expect(errors.advancedSettingsErrors).toEqual([])
      })

      it('should return errors from static method', () => {
        const staticErrors = OsGridRefField.getAllPossibleErrors()
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
          title: 'Example OS grid reference',
          name: 'myComponent',
          type: ComponentType.OsGridRefField,
          options: {}
        },
        assertions: [
          {
            input: getFormData('  TQ123456'),
            output: { value: getFormData('TQ123456') }
          },
          {
            input: getFormData('TQ123456  '),
            output: { value: getFormData('TQ123456') }
          },
          {
            input: getFormData('  TQ123456 \n\n'),
            output: { value: getFormData('TQ123456') }
          }
        ]
      },
      {
        description: 'Pattern validation',
        component: {
          title: 'Example OS grid reference',
          name: 'myComponent',
          type: ComponentType.OsGridRefField,
          options: {}
        },
        assertions: [
          {
            input: getFormData('TQ12345'),
            output: {
              value: getFormData('TQ12345'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Enter a valid OS grid reference for Example OS grid reference like TQ123456'
                })
              ])
            }
          },
          {
            input: getFormData('AA1234567'),
            output: {
              value: getFormData('AA1234567'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Enter a valid OS grid reference for Example OS grid reference like TQ123456'
                })
              ])
            }
          },
          {
            input: getFormData('TQABCDEF'),
            output: {
              value: getFormData('TQABCDEF'),
              errors: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Enter a valid OS grid reference for Example OS grid reference like TQ123456'
                })
              ])
            }
          }
        ]
      },
      {
        description: 'Custom validation message',
        component: {
          title: 'Example OS grid reference',
          name: 'myComponent',
          type: ComponentType.OsGridRefField,
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
          title: 'Example OS grid reference',
          name: 'myComponent',
          type: ComponentType.OsGridRefField,
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
          title: 'Example OS grid reference',
          name: 'myComponent',
          type: ComponentType.OsGridRefField,
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
        collection = new ComponentCollection([def as OsGridRefFieldComponent], {
          model
        })
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
