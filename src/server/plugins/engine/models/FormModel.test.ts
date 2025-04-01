import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/conditions-escaping.js'
import fieldsRequiredDefinition from '~/test/form/definitions/fields-required.js'

describe('FormModel', () => {
  describe('Constructor', () => {
    it("doesn't throw when conditions are passed with apostrophes", () => {
      expect(
        () => new FormModel(definition, { basePath: 'test' })
      ).not.toThrow()
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
        $$__referenceNumber: 1232456,
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
  })
})
