import {
  ComponentType,
  ExtensionType,
  type CheckboxesFieldComponent,
  type List
} from '@defra/forms-model'

import { type CheckboxesField } from '~/src/server/plugins/engine/components/CheckboxesField.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'

const additionalQuestion = {
  type: ExtensionType.AdditionalQuestion as const,
  id: 'e6b4b1a0-0a0a-4a0a-8a0a-0a0a0a0a0a0a',
  name: 'reason',
  title: 'Why not?',
  hint: 'Tell us why',
  options: { required: true },
  schema: { max: 50 }
}

function buildList(options: {
  exclusiveLast?: boolean
  withAdditionalQuestion?: boolean
}): List {
  const exclusive = {
    id: 'a0000000-0000-4000-8000-000000000009',
    text: 'None of these',
    value: 'none',
    extensions: [
      { type: ExtensionType.Exclusive as const },
      ...(options.withAdditionalQuestion ? [additionalQuestion] : [])
    ]
  }

  const others = [
    { id: 'a0000000-0000-4000-8000-000000000001', text: 'Paper', value: '1' },
    { id: 'a0000000-0000-4000-8000-000000000002', text: 'Glass', value: '2' }
  ]

  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    title: 'Waste types',
    name: 'wasteTypes',
    type: 'string',
    items: options.exclusiveLast
      ? [...others, exclusive]
      : [exclusive, ...others]
  } as List
}

const def: CheckboxesFieldComponent = {
  id: 'c0000000-0000-4000-8000-000000000001',
  title: 'Which waste types do you handle?',
  shortDescription: 'waste types you handle',
  name: 'myComponent',
  type: ComponentType.CheckboxesField,
  list: 'wasteTypes',
  options: {}
}

function buildCollection(list: List) {
  const updated = structuredClone(definition)
  updated.lists = [list]

  const model = new FormModel(updated, { basePath: 'test' })
  const collection = new ComponentCollection([def], { model })

  return {
    model,
    collection,
    field: collection.fields[0] as CheckboxesField
  }
}

describe('CheckboxesField exclusive option', () => {
  describe('without an exclusive item', () => {
    it('behaves exactly as before', () => {
      const list = buildList({})
      list.items = list.items.map(({ extensions: _ignored, ...item }) => item)

      const { collection, field } = buildCollection(list)

      expect(field.exclusiveItem).toBeUndefined()
      expect(field.collection).toBeUndefined()
      expect(field.hasOwnStateKey).toBe(false)

      const { errors } = collection.validate({ myComponent: ['1', '2'] })
      expect(errors).toBeUndefined()
    })
  })

  describe('validation', () => {
    it('accepts the exclusive option on its own', () => {
      const { collection } = buildCollection(buildList({}))

      const { value, errors } = collection.validate({ myComponent: ['none'] })

      expect(errors).toBeUndefined()
      expect(value).toEqual({ myComponent: ['none'] })
    })

    it('rejects the exclusive option alongside another', () => {
      const { collection } = buildCollection(buildList({}))

      const { errors } = collection.validate({ myComponent: ['1', 'none'] })

      expect(errors).toEqual([
        expect.objectContaining({
          name: 'myComponent',
          text: 'Select waste types you handle, or select ‘None of these’, but not both'
        })
      ])
    })
  })

  describe('additional question', () => {
    const list = buildList({ withAdditionalQuestion: true })

    it('adds a sibling state key and keeps the checkbox key', () => {
      const { field, collection } = buildCollection(list)

      expect(field.additionalQuestionName).toBe('myComponent__reason')
      expect(field.hasOwnStateKey).toBe(true)
      expect(collection.keys).toEqual(['myComponent', 'myComponent__reason'])
    })

    it('requires an answer when the exclusive option is selected', () => {
      const { collection } = buildCollection(list)

      const { errors } = collection.validate({
        myComponent: ['none'],
        myComponent__reason: ''
      })

      expect(errors).toEqual([
        expect.objectContaining({
          name: 'myComponent__reason',
          text: 'Enter why not'
        })
      ])
    })

    it('drops trailing question marks from the error label', () => {
      const { field } = buildCollection(list)
      const [additionalQuestionField] = field.collection?.fields ?? []

      expect(additionalQuestionField.title).toBe('Why not?')
      expect(additionalQuestionField.label).toBe('Why not')
      expect(additionalQuestionField.summaryLabel).toBe('Why not?')
    })

    it('keeps the answer when the exclusive option is selected', () => {
      const { collection, field } = buildCollection(list)

      const { value, errors } = collection.validate({
        myComponent: ['none'],
        myComponent__reason: 'Nothing applies'
      })

      expect(errors).toBeUndefined()
      expect(field.getStateFromValidForm(value)).toEqual({
        myComponent: ['none'],
        myComponent__reason: 'Nothing applies'
      })
    })

    it('drops the answer when validating through a translator', () => {
      const { collection, model } = buildCollection(list)

      // Translation replaces each field's schema to relabel it, which must not
      // discard the conditional wrapper around the additional question
      const { value, errors } = collection.validate(
        {
          myComponent: ['1'],
          myComponent__reason: 'Left over from before'
        },
        model.createTranslator('en-GB')
      )

      expect(errors).toBeUndefined()
      expect(value.myComponent__reason).toBeUndefined()
    })

    it('drops the answer when the exclusive option is not selected', () => {
      const { collection, field } = buildCollection(list)

      const { value, errors } = collection.validate({
        myComponent: ['1'],
        myComponent__reason: 'Left over from before'
      })

      expect(errors).toBeUndefined()
      expect(value.myComponent__reason).toBeUndefined()
      expect(field.getStateFromValidForm(value)).toEqual({
        myComponent: ['1'],
        myComponent__reason: null
      })
    })

    it('applies the additional question schema', () => {
      const { collection } = buildCollection(list)

      const { errors } = collection.validate({
        myComponent: ['none'],
        myComponent__reason: 'x'.repeat(51)
      })

      expect(errors).toEqual([
        expect.objectContaining({
          name: 'myComponent__reason',
          text: 'Why not must be 50 characters or less'
        })
      ])
    })

    it('only adds a summary field once the exclusive option is answered', () => {
      const { field } = buildCollection(list)

      expect(field.getSummaryFields({ myComponent: ['1'] })).toHaveLength(1)
      expect(
        field.getSummaryFields({
          myComponent: ['none'],
          myComponent__reason: 'Nothing applies'
        })
      ).toHaveLength(2)
    })
  })

  describe('view model', () => {
    const context = (payload = {}) => ({
      payload,
      errors: undefined,
      translator: new FormModel(definition, {
        basePath: '/'
      }).createTranslator()
    })

    it('marks the exclusive item and adds the divider after it when first', () => {
      const { field } = buildCollection(
        buildList({ withAdditionalQuestion: true })
      )

      const viewModel = field.getViewModel(context())
      const items = viewModel.items

      expect(items.map((item) => item.divider ?? item.value)).toEqual([
        'none',
        'or',
        '1',
        '2'
      ])
      expect(items[0].behaviour).toBe('exclusive')
      expect(items[0].hasAdditionalQuestion).toBe(true)
      expect(items[0].extensions).toBeUndefined()
      expect(viewModel.additionalQuestion?.model.name).toBe(
        'myComponent__reason'
      )
    })

    it('adds the divider before the exclusive item when last', () => {
      const { field } = buildCollection(buildList({ exclusiveLast: true }))

      const viewModel = field.getViewModel(context())
      const items = viewModel.items

      expect(items.map((item) => item.divider ?? item.value)).toEqual([
        '1',
        '2',
        'or',
        'none'
      ])
      expect(items[3].behaviour).toBe('exclusive')
      expect(viewModel.additionalQuestion).toBeUndefined()
    })
  })
})
