import {
  ComponentType,
  type DeclarationFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('DeclarationField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: DeclarationFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example Declaration Component',
        name: 'myComponent',
        content: 'Lorem ipsum dolar sit amet',
        shortDescription: 'Terms and conditions',
        type: ComponentType.DeclarationField,
        options: {}
      } satisfies DeclarationFieldComponent

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
              label: 'Terms and conditions'
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
            items: expect.arrayContaining([
              expect.objectContaining({
                allow: ['true'],
                flags: expect.objectContaining({
                  presence: 'required'
                })
              })
            ])
          })
        )
      })

      it('may have unchecked value in addition to true', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                allow: ['unchecked'],
                flags: expect.objectContaining({
                  result: 'strip'
                })
              })
            ])
          })
        )

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                allow: ['unchecked']
              })
            ])
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
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                allow: ['true'],
                flags: expect.not.objectContaining({
                  presence: 'required'
                })
              })
            ])
          })
        )

        const result = collectionOptional.validate(getFormData(['unchecked']))
        expect(result.errors).toBeUndefined()
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(getFormData(['unchecked', 'true']))

        expect(result1.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(['unchecked']))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'You must confirm you understand and agree with terms and conditions to continue'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData(['invalid']))
        const result2 = collection.validate(
          // @ts-expect-error - Allow invalid param for test
          getFormData({ unknown: 'invalid' })
        )
        // @ts-expect-error - Allow invalid param for test
        const result3 = collection.validate('false')

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
        expect(result3.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState(true)
        const state2 = getFormState()
        // context - boolean
        // state - boolean
        // string - I confirm that I understand and accept this declaration
        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('I understand and agree')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(true)
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('true'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState(true)
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe('true')
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState(true)
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe(true)
        expect(value2).toBe(false)
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(['true'])
        const payload2 = getFormData([])
        const payload3 = getFormData(['unchecked'])

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)
        const value3 = field.getStateFromValidForm(payload3)

        expect(value1).toEqual(getFormState(true))
        expect(value2).toEqual(getFormState(false))
        expect(value3).toEqual(getFormState(false))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData([]))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            attributes: {},
            values: [],
            content: 'Lorem ipsum dolar sit amet',
            id: 'myComponent',
            fieldset: {
              legend: {
                text: 'Example Declaration Component'
              }
            },
            items: [
              {
                value: 'true',
                text: 'I understand and agree'
              }
            ]
          })
        )
      })

      it('sets Nunjucks component value when posted', () => {
        def = {
          ...def,
          hint: 'Please read and confirm the following'
        } satisfies DeclarationFieldComponent

        collection = new ComponentCollection([def], { model })
        field = collection.fields[0]
        const viewModel = field.getViewModel(getFormData(['true']))

        expect(viewModel).toEqual(
          expect.objectContaining({
            values: ['true'],
            hint: {
              text: 'Please read and confirm the following'
            }
          })
        )
      })

      it('sets custom message when in def', () => {
        def = {
          ...def,
          title: 'Declaration',
          content:
            'Declaration:\n' +
            'By submitting this form, I consent to the collection and processing of my personal data for the purposes described.\n' +
            'I understand that my data may be shared with authorised third parties where required by law',
          options: {
            declarationConfirmationLabel:
              'I consent to the processing of my personal data'
          }
        } satisfies DeclarationFieldComponent

        collection = new ComponentCollection([def], { model })
        field = collection.fields[0]

        const viewModel = field.getViewModel(getFormData(['unchecked', 'true']))

        expect(viewModel).toEqual(
          expect.objectContaining({
            items: [
              {
                value: 'true',
                text: 'I consent to the processing of my personal data'
              }
            ]
          })
        )
      })
    })

    describe('AllPossibleErrors', () => {
      it('should return errors', () => {
        const errors = field.getAllPossibleErrors()
        expect(errors.baseErrors).not.toBeEmpty()
        expect(errors.advancedSettingsErrors).toBeEmpty()
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Default',
        component: {
          title: 'Terms and conditions',
          shortDescription: 'The terms and conditions',
          content: 'Lorem ipsum dolar sit amet',
          name: 'myComponent',
          type: ComponentType.DeclarationField,
          options: {}
        } satisfies DeclarationFieldComponent,
        assertions: [
          {
            input: getFormData(['unchecked', 'true']),
            output: {
              value: {
                myComponent: ['true']
              },
              errors: undefined
            }
          }
        ]
      },
      {
        description: 'Use short description if it exists',
        component: {
          title: 'Terms and conditions',
          shortDescription: 'The terms and conditions',
          content: 'Lorem ipsum dolar sit amet',
          name: 'myComponent',
          type: ComponentType.DeclarationField,
          options: {}
        } satisfies DeclarationFieldComponent,
        assertions: [
          {
            input: getFormData(['unchecked']),
            output: {
              value: { myComponent: [] },
              errors: [
                expect.objectContaining({
                  text: 'You must confirm you understand and agree with the terms and conditions to continue'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          content: 'Lorem ipsum dolar sit amet',
          type: ComponentType.DeclarationField,
          options: {
            required: false
          }
        } satisfies DeclarationFieldComponent,
        assertions: [
          {
            input: getFormData(['unchecked']),
            output: { value: { myComponent: [] } }
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
