import { ComponentType, type LatLongFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { LatLongField } from '~/src/server/plugins/engine/components/LatLongField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'

describe('LatLongField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: LatLongFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example lat long',
        shortDescription: 'Example location',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      } satisfies LatLongFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__latitude',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'Latitude' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__longitude',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'Longitude' })
          })
        )
      })

      it('uses collection names as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual([
          'myComponent',
          'myComponent__latitude',
          'myComponent__longitude'
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
          'myComponent__latitude',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__longitude',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [
            {
              title: 'Example lat long',
              name: 'myComponent',
              type: ComponentType.LatLongField,
              options: { required: false },
              schema: {}
            }
          ],
          { model }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__latitude',
          expect.objectContaining({ allow: [''] })
        )

        expect(keys).toHaveProperty(
          'myComponent__longitude',
          expect.objectContaining({ allow: [''] })
        )

        const result1 = collectionOptional.validate(
          getFormData({
            latitude: '',
            longitude: ''
          })
        )

        const result2 = collectionOptional.validate(
          getFormData({
            latitude: '51.5',
            longitude: ''
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeTruthy()
        expect(result2.errors?.length).toBeGreaterThan(0)
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(
          getFormData({
            latitude: '51.519450',
            longitude: '-0.127758'
          })
        )

        const result2 = collection.validate(
          getFormData({
            latitude: '50.5',
            longitude: '-8.9'
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
      })

      it('adds errors for empty value when short description exists', () => {
        const result = collection.validate(
          getFormData({
            latitude: '',
            longitude: ''
          })
        )

        expect(result.errors).toBeTruthy()
        expect(result.errors?.length).toBe(2)
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(
          getFormData({
            latitude: 'invalid',
            longitude: 'invalid'
          })
        )

        expect(result1.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState({
          latitude: 51.51945,
          longitude: -0.127758
        })
        const state2 = getFormState({})

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('Lat: 51.51945<br>Long: -0.127758<br>')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState({
          latitude: 51.51945,
          longitude: -0.127758
        })
        const state2 = getFormState({})

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(
          getFormData({
            latitude: 51.51945,
            longitude: -0.127758
          })
        )
        expect(payload2).toEqual(getFormData({}))
      })

      it('returns value from state', () => {
        const state1 = getFormState({
          latitude: 51.51945,
          longitude: -0.127758
        })
        const state2 = getFormState({})

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toEqual({
          latitude: 51.51945,
          longitude: -0.127758
        })

        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState({
          latitude: 51.51945,
          longitude: -0.127758
        })
        const state2 = getFormState({})

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe('Lat: 51.51945\nLong: -0.127758')
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData({
          latitude: 51.51945,
          longitude: -0.127758
        })
        const payload2 = getFormData({})

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(
          getFormState({
            latitude: 51.51945,
            longitude: -0.127758
          })
        )
        expect(value2).toEqual(getFormState({}))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const payload = getFormData({
          latitude: 51.51945,
          longitude: -0.127758
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
                label: expect.objectContaining({ text: 'Latitude' }),
                name: 'myComponent__latitude',
                id: 'myComponent__latitude',
                value: 51.51945
              }),
              expect.objectContaining({
                label: expect.objectContaining({ text: 'Longitude' }),
                name: 'myComponent__longitude',
                id: 'myComponent__longitude',
                value: -0.127758
              })
            ]
          })
        )
      })

      it('includes instruction text when provided', () => {
        const componentWithInstruction = new LatLongField(
          {
            ...def,
            options: { instructionText: 'Enter coordinates in **decimal**' }
          },
          { model }
        )

        const viewModel = componentWithInstruction.getViewModel(
          getFormData({
            latitude: 51.51945,
            longitude: -0.127758
          })
        )

        const instructionText =
          'instructionText' in viewModel ? viewModel.instructionText : undefined
        expect(instructionText).toBeTruthy()
        expect(instructionText).toContain('decimal')
      })

      it('sets error classes when component has errors', () => {
        const payload = getFormData({
          latitude: '',
          longitude: ''
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
        const staticErrors = LatLongField.getAllPossibleErrors()
        expect(staticErrors.baseErrors).not.toBeEmpty()
        expect(staticErrors.advancedSettingsErrors).not.toBeEmpty()
      })

      it('instance method should delegate to static method', () => {
        const staticResult = LatLongField.getAllPossibleErrors()
        const instanceResult = field.getAllPossibleErrors()

        expect(instanceResult).toEqual(staticResult)
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Trim empty spaces',
        component: createLatLongComponent(),
        assertions: [
          {
            input: getFormData({
              latitude: ' 51.5',
              longitude: ' -0.1'
            }),
            output: {
              value: getFormData({
                latitude: 51.5,
                longitude: -0.1
              })
            }
          },
          {
            input: getFormData({
              latitude: '51.5 ',
              longitude: '-0.1 '
            }),
            output: {
              value: getFormData({
                latitude: 51.5,
                longitude: -0.1
              })
            }
          }
        ]
      },
      {
        description: 'Schema min and max for latitude',
        component: {
          title: 'Example lat long',
          name: 'myComponent',
          type: ComponentType.LatLongField,
          options: {},
          schema: {
            latitude: {
              min: 50,
              max: 55
            }
          }
        } satisfies LatLongFieldComponent,
        assertions: [
          {
            input: getFormData({
              latitude: '49.9',
              longitude: '-0.1'
            }),
            output: {
              value: getFormData({
                latitude: 49.9,
                longitude: -0.1
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Latitude for .* must be between 50 and 55/
                  )
                })
              ]
            }
          },
          {
            input: getFormData({
              latitude: '55.1',
              longitude: '-0.1'
            }),
            output: {
              value: getFormData({
                latitude: 55.1,
                longitude: -0.1
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Latitude for .* must be between 50 and 55/
                  )
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema min and max for longitude',
        component: {
          title: 'Example lat long',
          name: 'myComponent',
          type: ComponentType.LatLongField,
          options: {},
          schema: {
            longitude: {
              min: -5,
              max: 1
            }
          }
        } satisfies LatLongFieldComponent,
        assertions: [
          {
            input: getFormData({
              latitude: '51.5',
              longitude: '-5.1'
            }),
            output: {
              value: getFormData({
                latitude: 51.5,
                longitude: -5.1
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Longitude for .* must be between -5 and 1/
                  )
                })
              ]
            }
          },
          {
            input: getFormData({
              latitude: '51.5',
              longitude: '1.1'
            }),
            output: {
              value: getFormData({
                latitude: 51.5,
                longitude: 1.1
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Longitude for .* must be between -5 and 1/
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
          title: 'Example lat long',
          name: 'myComponent',
          type: ComponentType.LatLongField,
          options: {},
          schema: {}
        } satisfies LatLongFieldComponent,
        assertions: [
          {
            input: getFormData({
              latitude: '51.12345678',
              longitude: '-0.1'
            }),
            output: {
              value: getFormData({
                latitude: 51.12345678,
                longitude: -0.1
              }),
              errors: [
                expect.objectContaining({
                  text: 'Latitude must have no more than 7 decimal places'
                })
              ]
            }
          },
          {
            input: getFormData({
              latitude: '51.5',
              longitude: '-0.12345678'
            }),
            output: {
              value: getFormData({
                latitude: 51.5,
                longitude: -0.12345678
              }),
              errors: [
                expect.objectContaining({
                  text: 'Longitude must have no more than 7 decimal places'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Minimum precision validation',
        component: createLatLongComponent(),
        assertions: [
          {
            input: getFormData({
              latitude: '52',
              longitude: '-1'
            }),
            output: {
              value: getFormData({
                latitude: 52,
                longitude: -1
              })
            }
          },
          {
            input: getFormData({
              latitude: '52.1',
              longitude: '-1.5'
            }),
            output: {
              value: getFormData({
                latitude: 52.1,
                longitude: -1.5
              })
            }
          },
          {
            input: getFormData({
              latitude: '52.123456',
              longitude: '-1.123456'
            }),
            output: {
              value: getFormData({
                latitude: 52.123456,
                longitude: -1.123456
              })
            }
          }
        ]
      },
      {
        description: 'Length and precision validation',
        component: createLatLongComponent(),
        assertions: [
          {
            input: getFormData({
              latitude: '52',
              longitude: '-1.5'
            }),
            output: {
              value: getFormData({
                latitude: 52,
                longitude: -1.5
              })
            }
          },
          // Latitude too long
          {
            input: getFormData({
              latitude: '52.12345678',
              longitude: '-1.5'
            }),
            output: {
              value: getFormData({
                latitude: 52.12345678,
                longitude: -1.5
              }),
              errors: [
                expect.objectContaining({
                  text: 'Latitude must have no more than 7 decimal places'
                })
              ]
            }
          },
          {
            input: getFormData({
              latitude: '52.1',
              longitude: '-1'
            }),
            output: {
              value: getFormData({
                latitude: 52.1,
                longitude: -1
              })
            }
          },
          // Longitude too long
          {
            input: getFormData({
              latitude: '52.1',
              longitude: '-1.12345678'
            }),
            output: {
              value: getFormData({
                latitude: 52.1,
                longitude: -1.12345678
              }),
              errors: [
                expect.objectContaining({
                  text: 'Longitude must have no more than 7 decimal places'
                })
              ]
            }
          },
          // Valid values
          {
            input: getFormData({
              latitude: '52.1',
              longitude: '-1.5'
            }),
            output: {
              value: getFormData({
                latitude: 52.1,
                longitude: -1.5
              })
            }
          },
          {
            input: getFormData({
              latitude: '52.1234',
              longitude: '-1.123'
            }),
            output: {
              value: getFormData({
                latitude: 52.1234,
                longitude: -1.123
              })
            }
          }
        ]
      },
      {
        description: 'Invalid format',
        component: createLatLongComponent(),
        assertions: [
          {
            input: getFormData({
              latitude: 'invalid',
              longitude: '-0.1'
            }),
            output: {
              value: getFormData({
                latitude: 'invalid',
                longitude: -0.1
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Enter a valid latitude for .* like 51.519450/
                  )
                })
              ]
            }
          },
          {
            input: getFormData({
              latitude: '51.5',
              longitude: 'invalid'
            }),
            output: {
              value: getFormData({
                latitude: 51.5,
                longitude: 'invalid'
              }),
              errors: [
                expect.objectContaining({
                  text: expect.stringMatching(
                    /Enter a valid longitude for .* like -0.127758/
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
          title: 'Example lat long',
          name: 'myComponent',
          type: ComponentType.LatLongField,
          options: {
            required: false
          },
          schema: {}
        } satisfies LatLongFieldComponent,
        assertions: [
          {
            input: getFormData({
              latitude: '',
              longitude: ''
            }),
            output: {
              value: getFormData({
                latitude: '',
                longitude: ''
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

/**
 * Factory function to create a default LatLongField component with optional overrides
 */
function createLatLongComponent(
  overrides: Partial<LatLongFieldComponent> = {}
): LatLongFieldComponent {
  return {
    title: 'Example lat long',
    name: 'myComponent',
    type: ComponentType.LatLongField,
    options: {},
    schema: {},
    ...overrides
  } satisfies LatLongFieldComponent
}

function getFormData(
  value:
    | { latitude?: string | number; longitude?: string | number }
    | Record<string, never>
) {
  if ('latitude' in value || 'longitude' in value) {
    return {
      myComponent__latitude: value.latitude,
      myComponent__longitude: value.longitude
    }
  }
  return {}
}

function getFormState(
  value:
    | {
        latitude?: number
        longitude?: number
      }
    | Record<string, never>
) {
  if ('latitude' in value || 'longitude' in value) {
    return {
      myComponent__latitude: value.latitude ?? null,
      myComponent__longitude: value.longitude ?? null
    }
  }
  return {
    myComponent__latitude: null,
    myComponent__longitude: null
  }
}
