import { ComponentType, type Page } from '@defra/forms-model'

import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import {
  prefillStateFromQueryParameters,
  stripParam
} from '~/src/server/plugins/engine/pageControllers/helpers/state.js'
import { type AnyFormRequest } from '~/src/server/plugins/engine/types.js'
import { type FormsService, type Services } from '~/src/server/types.js'

const formId = '9d8bbbc9-29f1-499b-9f76-b2648bcfdf20'

function buildMockPage(
  pagesOverride = {},
  stateOverride = {},
  servicesOverride = {} as Services
) {
  return {
    model: {
      formId,
      def: {
        metadata: {
          submission: { code: 'TEST-CODE' }
        } as { submission: { code: string } },
        pages: pagesOverride
      },
      getFormContext: jest.fn().mockReturnValue({
        isForceAccess: false,
        data: {}
      }),
      services: servicesOverride
    } as unknown as FormModel,
    ...stateOverride
  } as unknown as PageControllerClass
}

describe('State helpers', () => {
  describe('prefillStateFromQueryParameters', () => {
    const mockGetState = jest.fn()
    const mockMergeState = jest.fn()
    const mockRequestPrefill: AnyFormRequest = {
      app: {},
      yar: { flash: () => [] },
      params: { path: 'test-path' },
      query: {}
    } as unknown as AnyFormRequest

    it('should not add any state if no params', async () => {
      const mockPagePrefill = buildMockPage([], {
        getState: mockGetState,
        mergeState: mockMergeState
      })

      expect(
        await prefillStateFromQueryParameters(
          mockRequestPrefill,
          mockPagePrefill
        )
      ).toBeFalse()
      expect(mockMergeState).not.toHaveBeenCalled()
    })

    it('should ignore if no params (but some hidden fields)', async () => {
      const mockRequest2 = {
        ...mockRequestPrefill,
        query: {}
      } as unknown as AnyFormRequest

      const mockPagePrefill = buildMockPage(
        [
          {
            components: [
              {
                type: ComponentType.HiddenField,
                name: 'param2'
              },
              {
                type: ComponentType.HiddenField,
                name: 'param4'
              }
            ],
            next: []
          } as unknown as Page
        ],
        {
          getState: mockGetState,
          mergeState: mockMergeState
        }
      )

      expect(
        await prefillStateFromQueryParameters(mockRequest2, mockPagePrefill)
      ).toBeFalse()
      expect(mockMergeState).not.toHaveBeenCalled()
    })

    it('should only add state where param names match hidden field names', async () => {
      const mockRequest2 = {
        ...mockRequestPrefill,
        query: {
          param1: 'val1',
          param2: 'val2',
          param3: 'val3',
          param4: 'val4'
        }
      } as unknown as AnyFormRequest

      const mockPagePrefill = buildMockPage(
        [
          {
            components: [
              {
                type: ComponentType.HiddenField,
                name: 'param2'
              },
              {
                type: ComponentType.HiddenField,
                name: 'param4'
              }
            ],
            next: []
          } as unknown as Page
        ],
        {
          getState: mockGetState.mockResolvedValue({}),
          mergeState: mockMergeState
        }
      )

      expect(
        await prefillStateFromQueryParameters(mockRequest2, mockPagePrefill)
      ).toBe(true)
      expect(mockMergeState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          '__copiedToState9d8bbbc9-29f1-499b-9f76-b2648bcfdf20': 'true',
          param2: 'val2',
          param4: 'val4'
        }
      )
    })

    it('should ignore if already previously called', async () => {
      const mockRequest2 = {
        ...mockRequestPrefill,
        query: {
          param1: 'val1',
          param2: 'val2',
          param3: 'val3',
          param4: 'val4'
        }
      } as unknown as AnyFormRequest

      const mockPagePrefill = buildMockPage(
        [
          {
            components: [
              {
                type: ComponentType.HiddenField,
                name: 'param2'
              },
              {
                type: ComponentType.HiddenField,
                name: 'param4'
              }
            ],
            next: []
          } as unknown as Page
        ],
        {
          getState: mockGetState.mockResolvedValue({
            '__copiedToState9d8bbbc9-29f1-499b-9f76-b2648bcfdf20': 'true'
          }),
          mergeState: mockMergeState
        }
      )

      expect(
        await prefillStateFromQueryParameters(mockRequest2, mockPagePrefill)
      ).toBe(false)
      expect(mockMergeState).not.toHaveBeenCalled()
    })

    it('should call lookup function for formId', async () => {
      const mockRequest3 = {
        ...mockRequestPrefill,
        query: {
          formId: 'c644804b-2f23-4c96-a2fc-ad4975974723'
        }
      } as unknown as AnyFormRequest

      const mockPagePrefill = buildMockPage(
        [
          {
            components: [
              {
                type: ComponentType.HiddenField,
                name: 'formId'
              }
            ],
            next: []
          } as unknown as Page
        ],
        {
          getState: mockGetState.mockResolvedValue({}),
          mergeState: mockMergeState
        },
        {
          formsService: {
            getFormMetadata: jest.fn(),
            getFormMetadataById: jest
              .fn()
              .mockResolvedValue({ title: 'My looked-up form name' }),
            getFormDefinition: jest.fn()
          } as unknown as FormsService
        } as Services
      )

      await prefillStateFromQueryParameters(mockRequest3, mockPagePrefill)
      expect(mockMergeState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          '__copiedToState9d8bbbc9-29f1-499b-9f76-b2648bcfdf20': 'true',
          formId: 'c644804b-2f23-4c96-a2fc-ad4975974723',
          formName: 'My looked-up form name'
        }
      )
    })
  })

  describe('stripParam', () => {
    it('should remove param when exists', () => {
      const params = {
        paramName1: 'val1',
        returnUrl: 'http://somesite.com',
        paramName2: 'val2',
        paramName3: undefined
      }
      expect(stripParam(params, 'returnUrl')).toStrictEqual({
        paramName1: 'val1',
        paramName2: 'val2',
        paramName3: ''
      })
    })

    it('should handle param missing', () => {
      const params = {
        paramName1: 'val1',
        returnUrl: 'http://somesite.com',
        paramName2: 'val2'
      }
      expect(stripParam(params, 'paramNotThere')).toStrictEqual({
        paramName1: 'val1',
        returnUrl: 'http://somesite.com',
        paramName2: 'val2'
      })
    })

    it('should handle no params', () => {
      const params = {}
      expect(stripParam(params, 'anyParam')).toBeUndefined()
    })
  })
})
