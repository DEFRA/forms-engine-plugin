import {
  ComponentType,
  type EastingNorthingFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { EastingNorthingField } from '~/src/server/plugins/engine/components/EastingNorthingField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'

describe('EastingNorthingField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: EastingNorthingFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example easting northing',
        shortDescription: 'Example location',
        name: 'myComponent',
        type: ComponentType.EastingNorthingField,
        options: {},
        schema: {}
      } satisfies EastingNorthingFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__easting',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'Easting' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__northing',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'Northing' })
          })
        )
      })

      it('uses collection names as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual([
          'myComponent',
          'myComponent__easting',
          'myComponent__northing'
        ])

        expect(field.collection?.keys).not.toHaveProperty('myComponent')

        for (const key of field.collection?.keys ?? []) {
          expect(keys).toHaveProperty(key)
        }
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__easting',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__northing',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [
            {
              title: 'Example easting northing',
              name: 'myComponent',
              type: ComponentType.EastingNorthingField,
              options: { required: false },
              schema: {}
            }
          ],
          { model }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__easting',
          expect.objectContaining({ allow: [''] })
        )

        expect(keys).toHaveProperty(
          'myComponent__northing',
          expect.objectContaining({ allow: [''] })
        )

        const result1 = collectionOptional.validate(
          getFormData({
            easting: '',
            northing: ''
          })
        )

        const result2 = collectionOptional.validate(
          getFormData({
            easting: '12345',
            northing: ''
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeTruthy()
        expect(result2.errors?.length).toBeGreaterThan(0)
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(
          getFormData({
            easting: '12345',
            northing: '1234567'
          })
        )

        const result2 = collection.validate(
          getFormData({
            easting: '0',
            northing: '0'
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
      })

      it('adds errors for empty value when short description exists', () => {
        const result = collection.validate(
          getFormData({
            easting: '',
            northing: ''
          })
        )

        expect(result.errors).toBeTruthy()
        expect(result.errors?.length).toBe(2)
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(
          getFormData({
            easting: 'invalid',
            northing: 'invalid'
          })
        )

        const result2 = collection.validate(
          getFormData({
            easting: '12345.5',
            northing: '1234567.5'
          })
        )

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState({
          easting: 12345,
          northing: 1234567
        })
        const state2 = getFormState({})

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('Northing: 1234567<br>Easting: 12345<br>')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState({
          easting: 12345,
          northing: 1234567
        })
        const state2 = getFormState({})

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(
          getFormData({
            easting: 12345,
            northing: 1234567
          })
        )
        expect(payload2).toEqual(getFormData({}))
      })

      it('returns value from state', () => {
        const state1 = getFormState({
          easting: 12345,
          northing: 1234567
        })
        const state2 = getFormState({})

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toEqual({
          easting: 12345,
          northing: 1234567
        })

        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState({
          easting: 12345,
          northing: 1234567
        })
        const state2 = getFormState({})

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe('Northing: 1234567\nEasting: 12345')
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData({
          easting: 12345,
          northing: 1234567
        })
        const payload2 = getFormData({})

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(
          getFormState({
            easting: 12345,
            northing: 1234567
          })
        )
        expect(value2).toEqual(getFormState({}))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const payload = getFormData({
          easting: 12345,
          northing: 1234567
        })
        const viewModel = field.getViewModel(payload)

        expect(viewModel).toEqual(
          expect.objectContaining({
            fieldset: {
              legend: {
                text: def.title,
                classes: 'govuk-fieldset__legend--m'
              }
            },
            items: [
              expect.objectContaining({
                label: expect.objectContaining({ text: 'Easting' }),
                name: 'myComponent__easting',
                id: 'myComponent__easting',
                value: 12345
              }),
              expect.objectContaining({
                label: expect.objectContaining({ text: 'Northing' }),
                name: 'myComponent__northing',
                id: 'myComponent__northing',
                value: 1234567
              })
            ]
          })
        )
      })

      it('includes instruction text when provided', () => {
        const componentWithInstruction = new EastingNorthingField(
          {
            ...def,
            options: { instructionText: 'Enter coordinates in **meters**' }
          },
          { model }
        )

        const viewModel = componentWithInstruction.getViewModel(
          getFormData({
            easting: 12345,
            northing: 1234567
          })
        )

        const instructionText =
          'instructionText' in viewModel ? viewModel.instructionText : undefined
        expect(instructionText).toBeTruthy()
        expect(instructionText).toContain('meters')
      })

      it('sets error classes when component has errors', () => {
        const payload = getFormData({
          easting: '',
          northing: ''
        })

        const errors = [
          {
            name: 'myComponent',
            text: 'Error message',
            path: ['myComponent'],
            href: '#myComponent'
          }
        ]

        const viewModel = field.getViewModel(payload, errors)

        expect(viewModel.items?.[0]).toEqual(
          expect.objectContaining({
            classes: expect.stringContaining('govuk-input--error')
          })
        )

        expect(viewModel.items?.[1]).toEqual(
          expect.objectContaining({
            classes: expect.stringContaining('govuk-input--error')
          })
        )
      })
    })

    describe('AllPossibleErrors', () => {
      it('should return errors from instance method', () => {
        const errors = field.getAllPossibleErrors()
        expect(errors.baseErrors).not.toBeEmpty()
        expect(errors.advancedSettingsErrors).not.toBeEmpty()
      })

      it('should return errors from static method', () => {
        const staticErrors = EastingNorthingField.getAllPossibleErrors()
        expect(staticErrors.baseErrors).not.toBeEmpty()
        expect(staticErrors.advancedSettingsErrors).not.toBeEmpty()
      })

      it('instance method should delegate to static method', () => {
        const staticResult = EastingNorthingField.getAllPossibleErrors()
        const instanceResult = field.getAllPossibleErrors()

        expect(instanceResult).toEqual(staticResult)
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example easting northing',
          name: 'myComponent',
          type: ComponentType.EastingNorthingField,
          options: {},
          schema: {}
        } satisfies EastingNorthingFieldComponent,
        assertions: [
          {
            input: getFormData({
              easting: ' 12345',
              northing: ' 1234567'
            }),
            output: {
              value: getFormData({
                easting: 12345,
                northing: 1234567
              })
            }
          },
          {
            input: getFormData({
              easting: '12345 ',
              northing: '1234567 '
            }),
            output: {
              value: getFormData({
                easting: 12345,
                northing: 1234567
              })
            }
          }
        ]
      },
      {
        description: 'Schema min and max for easting',
        component: {
          title: 'Example easting northing',
          name: 'myComponent',
          type: ComponentType.EastingNorthingField,
          options: {},
          schema: {
            easting: {
              min: 1000,
              max: 60000
            }
          }
        } satisfies EastingNorthingFieldComponent,
        assertions: [
          {
            input: getFormData({
              easting: '999',
              northing: '1234567'
            }),
            output: {
              value: getFormData({
                easting: 999,
                northing: 1234567
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Easting for .* must be between 1000 and 60000/
                  )
                })
              ]
            }
          },
          {
            input: getFormData({
              easting: '60001',
              northing: '1234567'
            }),
            output: {
              value: getFormData({
                easting: 60001,
                northing: 1234567
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Easting for .* must be between 1000 and 60000/
                  )
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema min and max for northing',
        component: {
          title: 'Example easting northing',
          name: 'myComponent',
          type: ComponentType.EastingNorthingField,
          options: {},
          schema: {
            northing: {
              min: 1000,
              max: 1200000
            }
          }
        } satisfies EastingNorthingFieldComponent,
        assertions: [
          {
            input: getFormData({
              easting: '12345',
              northing: '999'
            }),
            output: {
              value: getFormData({
                easting: 12345,
                northing: 999
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Northing for .* must be between 1000 and 1200000/
                  )
                })
              ]
            }
          },
          {
            input: getFormData({
              easting: '12345',
              northing: '1200001'
            }),
            output: {
              value: getFormData({
                easting: 12345,
                northing: 1200001
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Northing for .* must be between 1000 and 1200000/
                  )
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Precision validation',
        component: {
          title: 'Example easting northing',
          name: 'myComponent',
          type: ComponentType.EastingNorthingField,
          options: {},
          schema: {}
        } satisfies EastingNorthingFieldComponent,
        assertions: [
          {
            input: getFormData({
              easting: '12345.5',
              northing: '1234567'
            }),
            output: {
              value: getFormData({
                easting: 12345.5,
                northing: 1234567
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Easting for .* must be between 1 and 6 digits/
                  )
                })
              ]
            }
          },
          {
            input: getFormData({
              easting: '12345',
              northing: '1234567.5'
            }),
            output: {
              value: getFormData({
                easting: 12345,
                northing: 1234567.5
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Northing for .* must be between 1 and 7 digits/
                  )
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example easting northing',
          name: 'myComponent',
          type: ComponentType.EastingNorthingField,
          options: {
            required: false
          },
          schema: {}
        } satisfies EastingNorthingFieldComponent,
        assertions: [
          {
            input: getFormData({
              easting: '',
              northing: ''
            }),
            output: {
              value: getFormData({
                easting: '',
                northing: ''
              })
            }
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
})

function getFormData(
  value:
    | { easting?: string | number; northing?: string | number }
    | Record<string, never>
) {
  if ('easting' in value || 'northing' in value) {
    return {
      myComponent__easting: value.easting,
      myComponent__northing: value.northing
    }
  }
  return {}
}

function getFormState(
  value:
    | {
        easting?: number
        northing?: number
      }
    | Record<string, never>
) {
  if ('easting' in value || 'northing' in value) {
    return {
      myComponent__easting: value.easting ?? null,
      myComponent__northing: value.northing ?? null
    }
  }
  return {
    myComponent__easting: null,
    myComponent__northing: null
  }
}
