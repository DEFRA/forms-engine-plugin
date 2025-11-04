import { ComponentType, type NumberFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  NumberField,
  validateMinimumPrecision,
  validateStringLength
} from '~/src/server/plugins/engine/components/NumberField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('NumberField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Helper Functions', () => {
    describe('validateStringLength', () => {
      it('returns valid when no constraints provided', () => {
        expect(validateStringLength(123)).toEqual({ isValid: true })
        expect(validateStringLength(123, undefined, undefined)).toEqual({
          isValid: true
        })
      })

      it('validates minimum length correctly', () => {
        expect(validateStringLength(12, 3)).toEqual({
          isValid: false,
          error: 'minLength'
        })
        expect(validateStringLength(123, 3)).toEqual({ isValid: true })
        expect(validateStringLength(1234, 3)).toEqual({ isValid: true })
      })

      it('validates maximum length correctly', () => {
        expect(validateStringLength(123456, undefined, 5)).toEqual({
          isValid: false,
          error: 'maxLength'
        })
        expect(validateStringLength(12345, undefined, 5)).toEqual({
          isValid: true
        })
        expect(validateStringLength(123, undefined, 5)).toEqual({
          isValid: true
        })
      })

      it('validates both min and max length', () => {
        expect(validateStringLength(12, 3, 5)).toEqual({
          isValid: false,
          error: 'minLength'
        })
        expect(validateStringLength(123456, 3, 5)).toEqual({
          isValid: false,
          error: 'maxLength'
        })
        expect(validateStringLength(1234, 3, 5)).toEqual({ isValid: true })
      })

      it('handles decimal numbers correctly', () => {
        // "52.1" = 4 characters
        expect(validateStringLength(52.1, 3, 5)).toEqual({ isValid: true })
        // "52.123456" = 9 characters
        expect(validateStringLength(52.123456, undefined, 8)).toEqual({
          isValid: false,
          error: 'maxLength'
        })
      })

      it('handles negative numbers correctly', () => {
        // "-1.5" = 4 characters
        expect(validateStringLength(-1.5, 3, 5)).toEqual({ isValid: true })
        // "-9.1234567" = 10 characters
        expect(validateStringLength(-9.1234567, undefined, 9)).toEqual({
          isValid: false,
          error: 'maxLength'
        })
      })
    })

    describe('validateMinimumPrecision', () => {
      it('returns false for integers', () => {
        expect(validateMinimumPrecision(52, 1)).toBe(false)
        expect(validateMinimumPrecision(100, 2)).toBe(false)
      })

      it('validates minimum precision correctly', () => {
        expect(validateMinimumPrecision(52.1, 1)).toBe(true)
        expect(validateMinimumPrecision(52.12, 2)).toBe(true)
        expect(validateMinimumPrecision(52.123, 3)).toBe(true)
      })

      it('returns false when precision is insufficient', () => {
        expect(validateMinimumPrecision(52.1, 2)).toBe(false)
        expect(validateMinimumPrecision(52.12, 3)).toBe(false)
      })

      it('handles exact precision requirement', () => {
        expect(validateMinimumPrecision(52.12345, 5)).toBe(true)
        expect(validateMinimumPrecision(52.1234, 5)).toBe(false)
      })
    })
  })

  describe('Defaults', () => {
    let def: NumberFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example number field',
        shortDescription: 'Example number',
        name: 'myComponent',
        type: ComponentType.NumberField,
        options: {},
        schema: {}
      } satisfies NumberFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'Example number'
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
        const result1 = collection.validate(getFormData('1'))
        const result2 = collection.validate(getFormData('10'))
        const result3 = collection.validate(getFormData('2024'))
        const result4 = collection.validate(getFormData(' 2020'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
        expect(result3.errors).toBeUndefined()
        expect(result4.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example number'
          })
        ])
      })

      it('adds errors for empty value given no short description exists', () => {
        def = {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {}
        } satisfies NumberFieldComponent

        collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example number field'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData(['invalid']))
        const result2 = collection.validate(
          // @ts-expect-error - Allow invalid param for test
          getFormData({ unknown: 'invalid' })
        )

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('2024')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(2024))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe(2024)
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe(2024)
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(2024)
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(2024))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData(2024))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 2024
          })
        )
      })

      it('sets Nunjucks component prefix and suffix', () => {
        const componentCustom = new NumberField(
          { ...def, options: { prefix: '£', suffix: 'per item' } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99.99))

        expect(viewModel.prefix).toEqual({ text: '£' })
        expect(viewModel.suffix).toEqual({ text: 'per item' })
      })

      it('sets Nunjucks component inputmode attribute when precision is not defined', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: undefined } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99))

        expect(viewModel.attributes).toHaveProperty('inputmode', 'numeric')
      })

      it('sets Nunjucks component inputmode attribute when precision is 0', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: 0 } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99))

        expect(viewModel.attributes).toHaveProperty('inputmode', 'numeric')
      })

      it('does not set Nunjucks component inputmode attribute when precision is positive', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: 2 } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99.99))

        expect(viewModel.attributes).not.toHaveProperty('inputmode', 'numeric')
      })
    })

    it('sets Nunjucks component value when invalid', () => {
      const viewModel = field.getViewModel(getFormData('AA'))

      expect(viewModel).toHaveProperty('value', 'AA')
    })

    describe('AllPossibleErrors', () => {
      it('should return errors', () => {
        const errors = field.getAllPossibleErrors()
        expect(errors.baseErrors).not.toBeEmpty()
        expect(errors.advancedSettingsErrors).not.toBeEmpty()
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {}
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('  2024'),
            output: { value: getFormData(2024) }
          },
          {
            input: getFormData('2024  '),
            output: { value: getFormData(2024) }
          },
          {
            input: getFormData('  2024 \n\n'),
            output: { value: getFormData(2024) }
          }
        ]
      },
      {
        description: 'Number validation',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {}
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('Not a number'),
            output: {
              value: getFormData('Not a number'),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a number'
                })
              ]
            }
          },
          {
            input: getFormData('£99.99'),
            output: {
              value: getFormData('£99.99'),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a number'
                })
              ]
            }
          },
          {
            input: getFormData('100.55'),
            output: { value: getFormData(100.55) }
          },
          {
            input: getFormData('3.14159'),
            output: { value: getFormData(3.14159) }
          }
        ]
      },
      {
        description: 'Schema precision (integers only)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 0
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a whole number'
                })
              ]
            }
          },
          {
            input: getFormData('3'),
            output: { value: getFormData(3) }
          }
        ]
      },
      {
        description: 'Schema precision (integers only when negative)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: -1
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a whole number'
                })
              ]
            }
          },
          {
            input: getFormData('3'),
            output: { value: getFormData(3) }
          }
        ]
      },
      {
        description: 'Schema precision (1 decimal place)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 1
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must have 1 or fewer decimal places'
                })
              ]
            }
          },
          {
            input: getFormData('3.1'),
            output: { value: getFormData(3.1) }
          }
        ]
      },
      {
        description: 'Schema precision (2 decimal places)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 2
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must have 2 or fewer decimal places'
                })
              ]
            }
          },
          {
            input: getFormData('3.1'),
            output: { value: getFormData(3.1) }
          },
          {
            input: getFormData('3.14'),
            output: { value: getFormData(3.14) }
          }
        ]
      },
      {
        description: 'Schema precision with unsafe numbers',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 2
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('64811494532973582'),
            output: {
              value: getFormData(64811494532973580),
              errors: [
                expect.objectContaining({
                  text: 'Enter example number field in the correct format'
                })
              ]
            }
          },
          {
            input: getFormData('3.1'),
            output: { value: getFormData(3.1) }
          },
          {
            input: getFormData('3.14'),
            output: { value: getFormData(3.14) }
          }
        ]
      },
      {
        description: 'Schema minPrecision (minimum 1 decimal place)',
        component: createPrecisionTestComponent(1),
        assertions: [
          {
            input: getFormData('52'),
            output: {
              value: getFormData(52),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must have at least 1 decimal place'
                })
              ]
            }
          },
          {
            input: getFormData('52.0'),
            output: {
              value: getFormData(52),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must have at least 1 decimal place'
                })
              ]
            }
          },
          {
            input: getFormData('52.1'),
            output: { value: getFormData(52.1) }
          },
          {
            input: getFormData('52.123456'),
            output: { value: getFormData(52.123456) }
          }
        ]
      },
      {
        description: 'Schema minPrecision (minimum 2 decimal places)',
        component: createPrecisionTestComponent(2),
        assertions: [
          {
            input: getFormData('52.1'),
            output: {
              value: getFormData(52.1),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must have at least 2 decimal places'
                })
              ]
            }
          },
          {
            input: getFormData('52.12'),
            output: { value: getFormData(52.12) }
          },
          {
            input: getFormData('52.1234567'),
            output: { value: getFormData(52.1234567) }
          }
        ]
      },
      {
        description: 'Schema minLength (minimum 3 characters)',
        component: createLengthTestComponent(3, undefined),
        assertions: [
          {
            input: getFormData('12'),
            output: {
              value: getFormData(12),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be at least 3 characters'
                })
              ]
            }
          },
          {
            input: getFormData('123'),
            output: { value: getFormData(123) }
          },
          {
            input: getFormData('1234'),
            output: { value: getFormData(1234) }
          }
        ]
      },
      {
        description: 'Schema maxLength (maximum 5 characters)',
        component: createLengthTestComponent(undefined, 5),
        assertions: [
          {
            input: getFormData('123456'),
            output: {
              value: getFormData(123456),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be no more than 5 characters'
                })
              ]
            }
          },
          {
            input: getFormData('12345'),
            output: { value: getFormData(12345) }
          },
          {
            input: getFormData('123'),
            output: { value: getFormData(123) }
          }
        ]
      },
      {
        description:
          'Schema minLength and maxLength (3-8 characters, like latitude)',
        component: {
          title: 'Latitude field',
          shortDescription: 'Latitude',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessages: {
              'number.minPrecision':
                '{{#label}} must have at least {{#minPrecision}} decimal place',
              'number.minLength':
                '{{#label}} must be between 3 and 10 characters',
              'number.maxLength':
                '{{#label}} must be between 3 and 10 characters'
            }
          },
          schema: {
            min: 49,
            max: 60,
            precision: 7,
            minPrecision: 1,
            minLength: 3,
            maxLength: 10
          }
        } as NumberFieldComponent,
        assertions: [
          {
            input: getFormData('52'),
            output: {
              value: getFormData(52),
              errors: [
                expect.objectContaining({
                  text: 'Latitude must have at least 1 decimal place'
                })
              ]
            }
          },
          {
            input: getFormData('52.12345678'),
            output: {
              value: getFormData(52.12345678),
              errors: [
                expect.objectContaining({
                  text: 'Latitude must have 7 or fewer decimal places'
                })
              ]
            }
          },
          {
            input: getFormData('52.1'),
            output: { value: getFormData(52.1) }
          },
          {
            input: getFormData('52.1234'),
            output: { value: getFormData(52.1234) }
          }
        ]
      },
      {
        description: 'Schema min and max',
        component: createNumberComponent({
          schema: {
            min: 5,
            max: 8
          }
        }),
        assertions: [
          {
            input: getFormData('4'),
            output: {
              value: getFormData(4),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be 5 or higher'
                })
              ]
            }
          },
          {
            input: getFormData('10'),
            output: {
              value: getFormData(10),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be 8 or lower'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Custom validation message',
        component: createNumberComponent({
          options: {
            customValidationMessage: 'This is a custom error',
            customValidationMessages: {
              'any.required': 'This is not used',
              'number.base': 'This is not used',
              'number.min': 'This is not used',
              'number.max': 'This is not used'
            }
          }
        }),
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
            input: getFormData('AA'),
            output: {
              value: getFormData('AA'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          },
          {
            input: getFormData('invalid'),
            output: {
              value: getFormData('invalid'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Custom validation messages (multiple)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessages: {
              'any.required': 'This is a custom required error',
              'number.base': 'This is a custom number error',
              'number.max': 'This is a custom max number error',
              'number.min': 'This is a custom min number error'
            }
          },
          schema: {
            min: 5,
            max: 8
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData(''),
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
            input: getFormData('AA'),
            output: {
              value: getFormData('AA'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom number error'
                })
              ]
            }
          },
          {
            input: getFormData('4'),
            output: {
              value: getFormData(4),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom min number error'
                })
              ]
            }
          },
          {
            input: getFormData('10'),
            output: {
              value: getFormData(10),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom max number error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Custom validation overrides schema precision message',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessage: 'This is a custom error'
          },
          schema: {
            precision: 2
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Custom validation message overrides length validation',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessage: 'This is a custom length error'
          },
          schema: {
            minLength: 3,
            maxLength: 5
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData('12'),
            output: {
              value: getFormData(12),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom length error'
                })
              ]
            }
          },
          {
            input: getFormData('123456'),
            output: {
              value: getFormData(123456),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom length error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            required: false
          },
          schema: {}
        } satisfies NumberFieldComponent,
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
        collection = new ComponentCollection([def], { model })
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

  describe('Edge cases', () => {
    let collection: ComponentCollection

    beforeEach(() => {
      const def = createNumberComponent({
        schema: {
          min: -100,
          max: 100,
          precision: 2
        }
      })
      collection = new ComponentCollection([def], { model })
    })

    it('handles negative numbers correctly', () => {
      const result = collection.validate(getFormData('-50.5'))
      expect(result).toEqual({
        value: getFormData(-50.5)
      })
    })

    it('handles zero correctly', () => {
      const result = collection.validate(getFormData('0'))
      expect(result).toEqual({
        value: getFormData(0)
      })
    })

    it('handles zero with decimal correctly', () => {
      const result = collection.validate(getFormData('0.0'))
      expect(result).toEqual({
        value: getFormData(0)
      })
    })

    it('handles negative zero correctly', () => {
      const result = collection.validate(getFormData('-0'))
      expect(result).toEqual({
        value: getFormData(0)
      })
    })

    it('handles scientific notation (parsed as number, may fail range)', () => {
      // JavaScript parses '1e10' as 10000000000, which exceeds max of 100
      const result = collection.validate(getFormData('1e10'))
      expect(result).toEqual({
        value: getFormData(10000000000),
        errors: [
          expect.objectContaining({
            text: 'Example number field must be 100 or lower'
          })
        ]
      })
    })

    it('handles scientific notation with negative exponent (parsed as number)', () => {
      // JavaScript parses '1e-5' as 0.00001, which fails precision check (5 decimal places > 2)
      const result = collection.validate(getFormData('1e-5'))
      expect(result.value).toEqual(getFormData(0.00001))
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0]).toMatchObject({
        text: 'Example number field must have 2 or fewer decimal places'
      })
    })

    it('handles large negative numbers', () => {
      const result = collection.validate(getFormData('-99.99'))
      expect(result).toEqual({
        value: getFormData(-99.99)
      })
    })

    it('handles numbers at boundary limits', () => {
      const maxResult = collection.validate(getFormData('100'))
      expect(maxResult).toEqual({
        value: getFormData(100)
      })

      const minResult = collection.validate(getFormData('-100'))
      expect(minResult).toEqual({
        value: getFormData(-100)
      })
    })

    describe('with length constraints', () => {
      beforeEach(() => {
        const def = createNumberComponent({
          schema: {
            min: -9,
            max: 9,
            precision: 7,
            minPrecision: 1,
            minLength: 2,
            maxLength: 10
          },
          options: {
            customValidationMessages: {
              'number.minPrecision':
                'Example number field must have at least {{minPrecision}} decimal place',
              'number.precision':
                'Example number field must have no more than {{limit}} decimal places',
              'number.minLength':
                'Example number field must be at least {{minLength}} characters',
              'number.maxLength':
                'Example number field must be no more than {{maxLength}} characters'
            }
          }
        })
        collection = new ComponentCollection([def], { model })
      })

      it('validates negative numbers with decimals', () => {
        const result = collection.validate(getFormData('-5.1234567'))
        expect(result).toEqual({
          value: getFormData(-5.1234567)
        })
      })

      it('rejects negative numbers that are too short', () => {
        const result = collection.validate(getFormData('-5'))
        expect(result.value).toEqual(getFormData(-5))
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].text).toContain('decimal place')
      })

      it('rejects numbers with too many characters', () => {
        const result = collection.validate(getFormData('-5.12345678'))
        expect(result.value).toEqual(getFormData(-5.12345678))
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].text).toContain('decimal places')
      })
    })
  })
})

/**
 * Factory function to create a default NumberField component with optional overrides
 */
function createNumberComponent(
  overrides: Partial<NumberFieldComponent> = {}
): NumberFieldComponent {
  const base = {
    title: 'Example number field',
    name: 'myComponent',
    type: ComponentType.NumberField,
    options: {},
    schema: {}
  } satisfies NumberFieldComponent

  // Deep merge for nested objects like options and schema
  return {
    ...base,
    ...overrides,
    options: { ...base.options, ...(overrides.options ?? {}) },
    schema: { ...base.schema, ...(overrides.schema ?? {}) }
  } satisfies NumberFieldComponent
}

/**
 * Helper for precision validation tests
 */
function createPrecisionTestComponent(
  minPrecision: number,
  precision = 7
): NumberFieldComponent {
  const pluralSuffix = minPrecision > 1 ? 's' : ''
  return createNumberComponent({
    options: {
      customValidationMessages: {
        'number.minPrecision': `{{#label}} must have at least {{#minPrecision}} decimal place${pluralSuffix}`
      }
    },
    schema: { precision, minPrecision }
  })
}

/**
 * Helper for length validation tests
 */
function createLengthTestComponent(
  minLength?: number,
  maxLength?: number
): NumberFieldComponent {
  const messages: Record<string, string> = {}
  if (minLength) {
    messages['number.minLength'] =
      '{{#label}} must be at least {{#minLength}} characters'
  }
  if (maxLength) {
    messages['number.maxLength'] =
      '{{#label}} must be no more than {{#maxLength}} characters'
  }

  return createNumberComponent({
    options: { customValidationMessages: messages },
    schema: { minLength, maxLength }
  })
}
