import {
  SchemaVersion,
  formDefinitionV2Schema,
  type FormDefinition
} from '@defra/forms-model'

import { todayAsDateOnly } from '~/src/server/plugins/engine/date-helper.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import { V2 as definitionV2 } from '~/test/form/definitions/conditions-basic.js'
import definition from '~/test/form/definitions/conditions-escaping.js'
import conditionsListDefinition from '~/test/form/definitions/conditions-list.js'
import relativeDatesDefinition from '~/test/form/definitions/conditions-relative-dates-v2.js'
import fieldsRequiredDefinition from '~/test/form/definitions/fields-required.js'
import joinedConditionsDefinition from '~/test/form/definitions/joined-conditions-simple-v2.js'

jest.mock('~/src/server/plugins/engine/date-helper.ts')

describe('FormModel', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('Constructor', () => {
    it('loads a valid form definition', () => {
      expect(
        () => new FormModel(definition, { basePath: 'test' })
      ).not.toThrow()
    })

    it('Sets the page title from first form component when empty (V2 only)', () => {
      const noTitlesDefinition = {
        ...definitionV2,
        pages: definitionV2.pages.map((page) => ({ ...page, title: '' }))
      }

      const model = new FormModel(noTitlesDefinition, { basePath: 'test' })

      expect(model.def.pages.at(0)?.title).toBe(
        'Have you previously been married?'
      )
      expect(model.def.pages.at(1)?.title).toBe('Date of marriage')
    })

    it('Gets a list by ID', () => {
      const definitionWithLists: FormDefinition = {
        ...definitionV2,
        lists: [
          {
            id: 'c5eba145-b04d-4d41-a50c-e5e2f9b6357f',
            type: 'string',
            title: 'foo',
            name: 'foo',
            items: [
              { text: 'a', value: 'a' },
              { text: 'b', value: 'b' }
            ]
          },
          {
            type: 'string',
            title: 'bar',
            name: 'bar',
            items: [
              {
                id: 'a85a42a8-3e08-4c2a-b263-a0dc0b8c49f6',
                text: 'a',
                value: 'a'
              },
              {
                id: 'c31664ac-887b-434b-b9f4-e5bc30d24439',
                text: 'b',
                value: 'b'
              }
            ]
          }
        ]
      }

      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionWithLists })

      const model = new FormModel(definitionWithLists, { basePath: 'test' })

      expect(
        model.getListById('c5eba145-b04d-4d41-a50c-e5e2f9b6357f')
      ).toBeDefined()
      expect(model.listDefIdMap.size).toBe(2) // 1 + the yes/no list. list 'bar' isn't present as there's no ID
    })

    it('Gets a component by ID', () => {
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionV2 })

      const model = new FormModel(definitionV2, { basePath: 'test' })

      expect(
        model.getComponentById('717eb213-4e4b-4a2d-9cfd-2780f5e1e3e5')
      ).toBeDefined()
      expect(model.listDefIdMap.size).toBe(1)
    })

    it('gets a condition by its ID', () => {
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionV2 })
      const model = new FormModel(definitionV2, { basePath: 'test' })

      expect(
        model.getConditionById('6c9e2f4a-1d7b-5e8c-3f6a-9e2d5b7c4f1a')
      ).toBeDefined()
    })

    it('throws an error if schema validation fails', () => {
      formDefinitionV2Schema.validate = jest.fn().mockReturnValueOnce({
        error: 'Validation error'
      })

      expect(() => new FormModel(definitionV2, { basePath: 'test' })).toThrow(
        'Validation error'
      )
    })

    it('assigns v1 to the schema if not defined', () => {
      const definitionWithoutSchema: FormDefinition = {
        ...definition,
        schema: undefined
      }

      // Mock validation to just return the definition
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionWithoutSchema })

      const model = new FormModel(definitionWithoutSchema, { basePath: 'test' })

      expect(model.schemaVersion).toBe(SchemaVersion.V1)
    })
  })

  describe('getFormContext', () => {
    it('clears a previous checkbox field value when the field is omitted from the payload', () => {
      const formModel = new FormModel(fieldsRequiredDefinition, {
        basePath: '/components'
      })

      const state = {
        $$__referenceNumber: 'foobar',
        checkboxesSingle: ['Arabian', 'Shetland']
      }
      const pageUrl = new URL('http://example.com/components/fields-required')

      const request: FormContextRequest = buildFormContextRequest({
        method: 'post',
        payload: { crumb: 'dummyCrumb', action: 'validate' },
        query: {},
        path: pageUrl.pathname,
        params: { path: 'components', slug: 'fields-required' },
        url: pageUrl,
        app: { model: formModel }
      })

      const context = formModel.getFormContext(request, state)

      expect(context.payload.checkboxesSingle).toEqual([])
      expect(context.errors).toContainEqual(
        expect.objectContaining({ name: 'checkboxesSingle' })
      )
      expect(context.referenceNumber).toEqual(expect.any(String))
    })

    it('handles missing reference numbers', () => {
      const formModel = new FormModel(fieldsRequiredDefinition, {
        basePath: '/components'
      })

      const state = {
        checkboxesSingle: ['Arabian', 'Shetland']
      }
      const pageUrl = new URL('http://example.com/components/fields-required')

      const request: FormContextRequest = buildFormContextRequest({
        method: 'post',
        payload: { crumb: 'dummyCrumb', action: 'validate' },
        query: {},
        path: pageUrl.pathname,
        params: { path: 'components', slug: 'fields-required' },
        url: pageUrl,
        app: { model: formModel }
      })

      expect(() => formModel.getFormContext(request, state)).toThrow(
        'Reference number not found in form state'
      )
    })

    it('handles non-string reference numbers', () => {
      const formModel = new FormModel(fieldsRequiredDefinition, {
        basePath: '/components'
      })

      const state = {
        $$__referenceNumber: 123456789,
        checkboxesSingle: ['Arabian', 'Shetland']
      }
      const pageUrl = new URL('http://example.com/components/fields-required')

      const request: FormContextRequest = buildFormContextRequest({
        method: 'post',
        payload: { crumb: 'dummyCrumb', action: 'validate' },
        query: {},
        path: pageUrl.pathname,
        params: { path: 'components', slug: 'fields-required' },
        url: pageUrl,
        app: { model: formModel }
      })

      expect(() => formModel.getFormContext(request, state)).toThrow(
        'Reference number not found in form state'
      )
    })

    it('redirects to the page if the list field (radio) is invalidated due to list item conditions', () => {
      const formModel = new FormModel(conditionsListDefinition, {
        basePath: '/conditional-list-items'
      })

      const state = {
        $$__referenceNumber: 'foobar',
        gXsqLq: true,
        QwcNsc: 'meat',
        zeQDES: ['peppers', 'cheese', 'ham']
      }
      const pageUrl = new URL(
        'http://example.com/conditional-list-items/summary'
      )

      const request: FormContextRequest = buildFormContextRequest({
        method: 'get',
        query: {},
        path: pageUrl.pathname,
        params: { path: 'summary', slug: 'conditional-list-items' },
        url: pageUrl,
        app: { model: formModel }
      })

      const context = formModel.getFormContext(request, state)

      expect(context.errors).toHaveLength(1)
      expect(context.errors?.at(0)?.text).toBe(
        'Options are different because you changed a previous answer'
      )
      expect(context.relevantPages).toHaveLength(2)
      expect(context.paths).toHaveLength(2)
      expect(context.relevantState).toEqual({ gXsqLq: true, QwcNsc: 'meat' })
    })

    it('redirects to the page if the list field (check) is invalidated due to list item conditions', () => {
      const formModel = new FormModel(conditionsListDefinition, {
        basePath: '/conditional-list-items'
      })

      const state = {
        $$__referenceNumber: 'foobar',
        gXsqLq: true,
        QwcNsc: 'vegan',
        zeQDES: ['peppers', 'cheese', 'ham']
      }
      const pageUrl = new URL(
        'http://example.com/conditional-list-items/summary'
      )

      const request: FormContextRequest = buildFormContextRequest({
        method: 'get',
        query: {},
        path: pageUrl.pathname,
        params: { path: 'summary', slug: 'conditional-list-items' },
        url: pageUrl,
        app: { model: formModel }
      })

      const context = formModel.getFormContext(request, state)

      expect(context.errors).toHaveLength(1)
      expect(context.errors?.at(0)?.text).toBe(
        'Options are different because you changed a previous answer'
      )
      expect(context.relevantPages).toHaveLength(3)
      expect(context.paths).toHaveLength(3)
      expect(context.relevantState).toEqual({
        gXsqLq: true,
        QwcNsc: 'vegan',
        zeQDES: ['peppers', 'cheese', 'ham']
      })
    })
  })

  describe('makeCondition', () => {
    test('relative date condition', () => {
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: relativeDatesDefinition })
      const model = new FormModel(relativeDatesDefinition, { basePath: 'test' })

      const allConditionsKeys = Object.keys(model.conditions)
      expect(allConditionsKeys).toHaveLength(8)

      // Only test releative date conditions
      const relativeConditionsKeys = allConditionsKeys.slice(4)
      expect(relativeConditionsKeys).toHaveLength(4)

      const formState = {
        ybMHIv: '2023-06-18'
      }

      const expectedResultsDayBefore = [true, false, false, true]

      const expectedResultsDayOf = [true, true, false, false]

      const expectedResultsDayAfter = [false, true, true, false]

      // Only relative date conditions
      for (let i = 0; i < relativeConditionsKeys.length; i++) {
        const condition = model.conditions[relativeConditionsKeys[i]]
        jest.mocked(todayAsDateOnly).mockReturnValue(new Date(2025, 5, 19))
        const conditionExec = model.makeCondition(
          // @ts-expect-error - type doesnt need to match for this test
          condition
        )
        formState.ybMHIv = '2023-06-18'
        expect(conditionExec.fn(formState)).toBe(expectedResultsDayBefore[i])

        formState.ybMHIv = '2023-06-19'
        expect(conditionExec.fn(formState)).toBe(expectedResultsDayOf[i])

        formState.ybMHIv = '2023-06-20'
        expect(conditionExec.fn(formState)).toBe(expectedResultsDayAfter[i])
      }
    })
  })
})

describe('FormModel - Joined Conditions', () => {
  it('should handle joined conditions correctly', () => {
    formDefinitionV2Schema.validate = jest
      .fn()
      .mockReturnValue({ value: joinedConditionsDefinition })

    const model = new FormModel(joinedConditionsDefinition, {
      basePath: 'test'
    })

    expect(model.conditions).toBeDefined()
    expect(Object.keys(model.conditions)).toHaveLength(3)

    const joinedCondition =
      model.conditions['db43c6bc-9ce6-478b-8345-4fff5eff2ba3']
    expect(joinedCondition).toBeDefined()
    expect(joinedCondition?.displayName).toBe('is Bob AND over 18')

    const stateAllTrue = { userName: 'Bob', isOverEighteen: true }
    expect(joinedCondition?.fn(stateAllTrue)).toBe(true)

    const statePartialTrue = { userName: 'Alice', isOverEighteen: true }
    expect(joinedCondition?.fn(statePartialTrue)).toBe(false)

    const stateFalse = { userName: 'Alice', isOverEighteen: false }
    expect(joinedCondition?.fn(stateFalse)).toBe(false)
  })

  it('should evaluate page conditions using joined conditions', () => {
    formDefinitionV2Schema.validate = jest
      .fn()
      .mockReturnValue({ value: joinedConditionsDefinition })

    const model = new FormModel(joinedConditionsDefinition, {
      basePath: 'test'
    })

    const joinedConditionPage = model.pages.find(
      (page) => page.path === '/simple-and-page'
    )

    expect(joinedConditionPage?.condition).toBeDefined()

    const trueState = { userName: 'Bob', isOverEighteen: true }
    expect(joinedConditionPage?.condition?.fn(trueState)).toBe(true)

    const falseState = { userName: 'Bob', isOverEighteen: false }
    expect(joinedConditionPage?.condition?.fn(falseState)).toBe(false)
  })

  it('should handle V1 joined conditions without aliases', () => {
    formDefinitionV2Schema.validate = jest
      .fn()
      .mockReturnValue({ value: definition })

    const model = new FormModel(definition, {
      basePath: 'test'
    })

    expect(model.conditions).toBeDefined()
    expect(Object.keys(model.conditions)).toHaveLength(1)

    const joinedCondition = model.conditions.ZCXeMz
    expect(joinedCondition).toBeDefined()
    expect(joinedCondition?.displayName).toBe('test')

    const testState = { NIJphU: "ap'ostrophe's", iraEpG: "shouldn't've" }
    expect(joinedCondition?.fn(testState)).toBe(true)

    const testStateFalse = { NIJphU: 'other', iraEpG: "shouldn't've" }
    expect(joinedCondition?.fn(testStateFalse)).toBe(false)

    const context = model.toConditionContext(testState, model.conditions)

    expect(context).not.toHaveProperty('cond_ZCXeMz')

    expect(context).toHaveProperty('ZCXeMz')

    expect(context).toHaveProperty('NIJphU', "ap'ostrophe's")
    expect(context).toHaveProperty('iraEpG', "shouldn't've")
  })

  it('should use schema version to determine condition aliases', () => {
    const v1Definition = { ...definition, schema: SchemaVersion.V1 }
    formDefinitionV2Schema.validate = jest
      .fn()
      .mockReturnValue({ value: v1Definition })

    const v1Model = new FormModel(v1Definition, { basePath: 'test' })
    expect(v1Model.schemaVersion).toBe(SchemaVersion.V1)

    const v1TestState = { NIJphU: "ap'ostrophe's", iraEpG: "shouldn't've" }
    const v1Context = v1Model.toConditionContext(
      v1TestState,
      v1Model.conditions
    )

    expect(v1Context).toHaveProperty('ZCXeMz')
    expect(v1Context).not.toHaveProperty('cond_ZCXeMz')

    formDefinitionV2Schema.validate = jest
      .fn()
      .mockReturnValue({ value: joinedConditionsDefinition })

    const v2Model = new FormModel(joinedConditionsDefinition, {
      basePath: 'test'
    })
    expect(v2Model.schemaVersion).toBe(SchemaVersion.V2)

    const v2TestState = { userName: 'Bob', isOverEighteen: true }
    const v2Context = v2Model.toConditionContext(
      v2TestState,
      v2Model.conditions
    )

    expect(v2Context).toHaveProperty('cond_d15aff7a622440a28e5f51a5af2f7910')
    expect(v2Context).toHaveProperty('cond_d1f9fcc7f09847e79d314f5ee57ba985')
    expect(v2Context).toHaveProperty('cond_db43c6bc9ce6478b83454fff5eff2ba3')

    expect(v2Context).not.toHaveProperty('d15aff7a-6224-40a2-8e5f-51a5af2f7910')
    expect(v2Context).not.toHaveProperty('d1f9fcc7-f098-47e7-9d31-4f5ee57ba985')
    expect(v2Context).not.toHaveProperty('db43c6bc-9ce6-478b-8345-4fff5eff2ba3')
  })

  describe('generateConditionAlias', () => {
    it('should generate valid JavaScript identifiers from condition IDs', () => {
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: joinedConditionsDefinition })

      const model = new FormModel(joinedConditionsDefinition, {
        basePath: 'test'
      })

      const evaluationState = { userName: 'Bob', isOverEighteen: true }

      const context = model.toConditionContext(
        evaluationState,
        model.conditions
      )

      expect(context).toHaveProperty('cond_d15aff7a622440a28e5f51a5af2f7910')
      expect(context).toHaveProperty('cond_d1f9fcc7f09847e79d314f5ee57ba985')
      expect(context).toHaveProperty('cond_db43c6bc9ce6478b83454fff5eff2ba3')
    })
  })

  describe('toConditionExpression', () => {
    it('should handle V2 engine with display name replacement', () => {
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: joinedConditionsDefinition })

      const model = new FormModel(joinedConditionsDefinition, {
        basePath: 'test'
      })

      const joinedCondition =
        model.conditions['db43c6bc-9ce6-478b-8345-4fff5eff2ba3']
      expect(joinedCondition).toBeDefined()

      const stateTrue = { userName: 'Bob', isOverEighteen: true }
      const stateFalse = { userName: 'Alice', isOverEighteen: false }

      expect(joinedCondition?.fn(stateTrue)).toBe(true)
      expect(joinedCondition?.fn(stateFalse)).toBe(false)

      expect(joinedCondition?.expr).toBeDefined()
      expect(typeof joinedCondition?.expr.evaluate).toBe('function')
    })

    it('should handle V1 engine without display name replacement', () => {
      const model = new FormModel(definition, { basePath: 'test' })

      const condition = model.conditions.ZCXeMz
      expect(condition).toBeDefined()
      expect(condition?.expr).toBeDefined()

      const testState = { NIJphU: "ap'ostrophe's", iraEpG: "shouldn't've" }
      expect(condition?.fn(testState)).toBe(true)
    })

    it('should handle conditions without display names', () => {
      const definitionWithoutDisplayName = {
        ...joinedConditionsDefinition,
        conditions: joinedConditionsDefinition.conditions.map((condition) => ({
          ...condition,
          displayName: condition.displayName || 'fallback'
        }))
      }

      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionWithoutDisplayName })

      const model = new FormModel(definitionWithoutDisplayName, {
        basePath: 'test'
      })

      expect(model.conditions).toBeDefined()
      expect(Object.keys(model.conditions)).toHaveLength(3)
    })
  })
})
