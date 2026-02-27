import {
  ComponentType,
  type GeospatialFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  validSingleState,
  validState
} from '~/src/server/plugins/engine/components/helpers/__stubs__/geospatial.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('GeospatialField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: GeospatialFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example geospatial title',
        shortDescription: 'Example geospatial',
        name: 'myComponent',
        type: ComponentType.GeospatialField,
        options: {}
      } satisfies GeospatialFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses component short description as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'Example geospatial'
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

        const result = collectionOptional.validate(getFormData('[]'))
        expect(result.errors).toBeUndefined()

        const result2 = collectionOptional.validate(getFormData([]))
        expect(result2.errors).toBeUndefined()
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(getFormData(validState))

        expect(result1.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Example geospatial must be a valid json array string'
          })
        ])
      })

      it('adds errors for empty value given no short description', () => {
        def = {
          title: 'Example geospatial title',
          name: 'myComponent',
          type: ComponentType.GeospatialField,
          options: {}
        } satisfies GeospatialFieldComponent

        collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Example geospatial title must contain at least 1 items'
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
      it('returns text from single feature state', () => {
        const state1 = getFormState(validSingleState)
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('My farm house:<br>SJ 61896 71377<br>')
        expect(answer2).toBe('')
      })

      it('returns text from multiple features state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe(
          `My farm house:<br>SJ 61896 71377<br>Main gas line:<br>SJ 62022 71500 to SJ 61904 71391<br>My Pony Paddock:<br>SJ 61829 71378<br>My farm house #2:<br>SJ 61894 71483<br>`
        )
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(validState))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe(validState)
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        const { id: id1 } = validState[0]
        const { id: id2 } = validState[1]
        const { id: id3 } = validState[2]
        const { id: id4 } = validState[3]

        expect(value1).toEqual([id1, id2, id3, id4])
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(validState)
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(validState))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData('Geospatial'))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'Geospatial'
          })
        )
      })
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
        description: 'Required',
        component: {
          title: 'Example geospatial field',
          name: 'myComponent',
          type: ComponentType.GeospatialField,
          options: {
            required: true
          }
        } satisfies GeospatialFieldComponent,
        assertions: [
          {
            input: getFormData([]),
            output: {
              value: getFormData([]),
              errors: [
                expect.objectContaining({
                  text: 'Example geospatial field must contain at least 1 items'
                })
              ]
            }
          },
          {
            input: getFormData(),
            output: {
              value: getFormData(),
              errors: [
                expect.objectContaining({
                  text: 'Select example geospatial field'
                })
              ]
            }
          },
          {
            input: getFormData(validSingleState),
            output: {
              value: getFormData(validSingleState)
            }
          },
          {
            input: getFormData(validState),
            output: {
              value: getFormData(validState)
            }
          }
        ]
      },
      {
        description: 'Optional',
        component: {
          title: 'Example geospatial field',
          name: 'myComponent',
          type: ComponentType.GeospatialField,
          options: {
            required: false
          }
        } satisfies GeospatialFieldComponent,
        assertions: [
          {
            input: getFormData([]),
            output: {
              value: getFormData([])
            }
          },
          {
            input: getFormData(),
            output: {
              value: getFormData(),
              errors: [
                expect.objectContaining({
                  text: 'Select example geospatial field'
                })
              ]
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
