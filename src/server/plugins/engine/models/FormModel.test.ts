import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import { V2 as definitionV2 } from '~/test/form/definitions/conditions-basic.js'
import definition from '~/test/form/definitions/conditions-escaping.js'
import conditionsListDefinition from '~/test/form/definitions/conditions-list.js'
import fieldsRequiredDefinition from '~/test/form/definitions/fields-required.js'

describe('FormModel', () => {
  describe('Constructor', () => {
    it("doesn't throw when conditions are passed with apostrophes", () => {
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

      const request: FormContextRequest = {
        method: 'post',
        payload: { crumb: 'dummyCrumb', action: 'validate' },
        query: {},
        path: pageUrl.pathname,
        params: { path: 'components', slug: 'fields-required' },
        url: pageUrl,
        app: { model: formModel }
      }

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

      const request: FormContextRequest = {
        method: 'post',
        payload: { crumb: 'dummyCrumb', action: 'validate' },
        query: {},
        path: pageUrl.pathname,
        params: { path: 'components', slug: 'fields-required' },
        url: pageUrl,
        app: { model: formModel }
      }

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

      const request: FormContextRequest = {
        method: 'post',
        payload: { crumb: 'dummyCrumb', action: 'validate' },
        query: {},
        path: pageUrl.pathname,
        params: { path: 'components', slug: 'fields-required' },
        url: pageUrl,
        app: { model: formModel }
      }

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

      const request: FormContextRequest = {
        method: 'get',
        query: {},
        path: pageUrl.pathname,
        params: { path: 'summary', slug: 'conditional-list-items' },
        url: pageUrl,
        app: { model: formModel }
      }

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

      const request: FormContextRequest = {
        method: 'get',
        query: {},
        path: pageUrl.pathname,
        params: { path: 'summary', slug: 'conditional-list-items' },
        url: pageUrl,
        app: { model: formModel }
      }

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
})
