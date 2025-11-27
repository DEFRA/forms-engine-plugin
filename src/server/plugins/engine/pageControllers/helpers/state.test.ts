import { ComponentType, type Page } from '@defra/forms-model'

import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import {
  prefillStateFromQueryParameters,
  stripParam
} from '~/src/server/plugins/engine/pageControllers/helpers/state.js'
import { type AnyFormRequest } from '~/src/server/plugins/engine/types.js'
import { type FormsService, type Services } from '~/src/server/types.js'

function buildMockModel(
  pagesOverride = [] as Page[],
  pagesControllerOverride = [] as PageControllerClass[],
  servicesOverride = {} as Services
) {
  return {
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
    pages: pagesControllerOverride,
    services: servicesOverride
  } as unknown as FormModel
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
      const mockModelPrefill = buildMockModel(
        [],
        [
          {
            getState: mockGetState,
            mergeState: mockMergeState
          } as unknown as PageControllerClass
        ]
      )

      expect(
        await prefillStateFromQueryParameters(
          mockRequestPrefill,
          mockModelPrefill
        )
      ).toBeFalse()
      expect(mockMergeState).not.toHaveBeenCalled()
    })

    it('should ignore if no params (but some hidden fields)', async () => {
      const mockRequest2 = {
        ...mockRequestPrefill,
        query: {}
      } as unknown as AnyFormRequest

      const mockModel = buildMockModel(
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
        [
          {
            getState: mockGetState.mockResolvedValue({}),
            mergeState: mockMergeState
          } as unknown as PageControllerClass
        ]
      )

      expect(
        await prefillStateFromQueryParameters(mockRequest2, mockModel)
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

      const mockModel = buildMockModel(
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
        [
          {
            getState: mockGetState.mockResolvedValue({}),
            mergeState: mockMergeState
          } as unknown as PageControllerClass
        ]
      )

      expect(
        await prefillStateFromQueryParameters(mockRequest2, mockModel)
      ).toBe(true)
      expect(mockMergeState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          __copiedToState: 'true',
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

      const mockModel = buildMockModel(
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
        [
          {
            getState: mockGetState.mockResolvedValue({
              __copiedToState: 'true'
            }),
            mergeState: mockMergeState
          } as unknown as PageControllerClass
        ]
      )

      expect(
        await prefillStateFromQueryParameters(mockRequest2, mockModel)
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

      const mockModel = buildMockModel(
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
        [
          {
            getState: mockGetState.mockResolvedValue({}),
            mergeState: mockMergeState
          } as unknown as PageControllerClass
        ],
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

      await prefillStateFromQueryParameters(mockRequest3, mockModel)
      expect(mockMergeState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          __copiedToState: 'true',
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
