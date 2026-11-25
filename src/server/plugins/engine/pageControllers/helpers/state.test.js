import { ComponentType, ControllerType } from '@defra/forms-model'

import {
  checkSaveAndExitRepeater,
  copyNotYetValidatedState,
  prefillStateFromQueryParameters,
  stripParam
} from '~/src/server/plugins/engine/pageControllers/helpers/state.js'

const mockGetCacheService = jest.fn()
const mockCacheService = { setState: jest.fn() }

jest.mock('~/src/server/plugins/engine/helpers.ts', () => ({
  __esModule: true,
  /**
   * @param {...unknown} args
   */
  getCacheService: (...args) =>
    /** @type {unknown} */ (mockGetCacheService(...args))
}))

function buildMockPage(
  pagesOverride = {},
  stateOverride = {},
  servicesOverride = /** @type {Services} */ ({})
) {
  return /** @type {PageControllerClass} */ (
    /** @type {unknown} */ ({
      model: /** @type {FormModel} */ (
        /** @type {unknown} */ ({
          def: {
            metadata: /** @type {{ submission: { code: string } }} */ ({
              submission: { code: 'TEST-CODE' }
            }),
            pages: pagesOverride
          },
          getFormContext: jest.fn().mockReturnValue({
            isForceAccess: false,
            data: {}
          }),
          services: servicesOverride
        })
      ),
      ...stateOverride
    })
  )
}

describe('State helpers', () => {
  describe('prefillStateFromQueryParameters', () => {
    const mockGetState = jest.fn()
    const mockMergeState = jest.fn()
    /** @type {AnyFormRequest} */
    const mockRequestPrefill = /** @type {AnyFormRequest} */ (
      /** @type {unknown} */ ({
        app: {},
        yar: { flash: () => [] },
        params: { path: 'test-path' },
        query: {}
      })
    )

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
      const mockRequest2 = /** @type {AnyFormRequest} */ (
        /** @type {unknown} */ ({
          ...mockRequestPrefill,
          query: {}
        })
      )

      const mockPagePrefill = buildMockPage(
        [
          /** @type {Page} */ (
            /** @type {unknown} */ ({
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
            })
          )
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
      const mockRequest2 = /** @type {AnyFormRequest} */ (
        /** @type {unknown} */ ({
          ...mockRequestPrefill,
          query: {
            param1: 'val1',
            param2: 'val2',
            param3: 'val3',
            param4: 'val4'
          }
        })
      )

      const mockPagePrefill = buildMockPage(
        [
          /** @type {Page} */ (
            /** @type {unknown} */ ({
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
            })
          )
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
          param2: 'val2',
          param4: 'val4'
        }
      )
    })

    it('should call lookup function for formId', async () => {
      const mockRequest3 = /** @type {AnyFormRequest} */ (
        /** @type {unknown} */ ({
          ...mockRequestPrefill,
          query: {
            formId: 'c644804b-2f23-4c96-a2fc-ad4975974723'
          }
        })
      )

      const mockPagePrefill = buildMockPage(
        [
          /** @type {Page} */ (
            /** @type {unknown} */ ({
              components: [
                {
                  type: ComponentType.HiddenField,
                  name: 'formId'
                }
              ],
              next: []
            })
          )
        ],
        {
          getState: mockGetState.mockResolvedValue({}),
          mergeState: mockMergeState
        },
        /** @type {Services} */ ({
          formsService: /** @type {FormsService} */ (
            /** @type {unknown} */ ({
              getFormMetadata: jest.fn(),
              getFormMetadataById: jest
                .fn()
                .mockResolvedValue({ title: 'My looked-up form name' }),
              getFormDefinition: jest.fn()
            })
          )
        })
      )

      await prefillStateFromQueryParameters(mockRequest3, mockPagePrefill)
      expect(mockMergeState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
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
      /** @type {FormQuery} */
      const params = {}
      expect(stripParam(params, 'anyParam')).toBeUndefined()
    })
  })

  describe('copyNotYetValidatedState', () => {
    beforeEach(() => {
      mockGetCacheService.mockReturnValue(mockCacheService)
    })
    it('should ignore if no invalid state', async () => {
      const mockRequest = /** @type {AnyFormRequest} */ ({})
      const mockContext = /** @type {FormContext} */ (
        /** @type {unknown} */ ({
          state: { abc: '123' },
          payload: {}
        })
      )
      await copyNotYetValidatedState(mockRequest, mockContext)
      expect(mockContext.state).toEqual({ abc: '123' })
      expect(mockContext.payload).toEqual({})
    })

    it('should ignore if wrong path', async () => {
      const mockRequest = /** @type {AnyFormRequest} */ (
        /** @type {unknown} */ ({
          url: {
            pathname: '/form-page1'
          }
        })
      )
      const mockContext = /** @type {FormContext} */ (
        /** @type {unknown} */ ({
          state: {
            abc: '123',
            __stateNotYetValidated: {
              def: '456',
              __currentPagePath: '/root'
            }
          },
          payload: {}
        })
      )
      await copyNotYetValidatedState(mockRequest, mockContext)
      expect(mockContext.state).toEqual({
        abc: '123',
        __stateNotYetValidated: {
          def: '456',
          __currentPagePath: '/root'
        }
      })
      expect(mockContext.payload).toEqual({})
    })

    it('should apply if correct path', async () => {
      const mockRequest = /** @type {AnyFormRequest} */ (
        /** @type {unknown} */ ({
          url: {
            pathname: '/form-page1'
          }
        })
      )
      const mockContext = /** @type {FormContext} */ (
        /** @type {unknown} */ ({
          state: {
            abc: '123',
            __stateNotYetValidated: {
              def: '456',
              __currentPagePath: '/form-page1'
            }
          },
          payload: {}
        })
      )
      await copyNotYetValidatedState(mockRequest, mockContext)
      expect(mockContext.state).toEqual({
        abc: '123',
        __stateNotYetValidated: undefined
      })
      expect(mockContext.payload).toEqual({
        def: '456'
      })
    })
  })

  describe('checkSaveAndExitRepeater', () => {
    /**
     * @param {string} path
     */
    function createMockContextWithPath(path) {
      return /** @type {FormContext} */ (
        /** @type {unknown} */ ({
          state: {
            abc: '123',
            __stateNotYetValidated: {
              def: '456',
              __currentPagePath: path
            }
          },
          payload: {}
        })
      )
    }

    const mockModel = /** @type {FormModel} */ (
      /** @type {unknown} */ ({
        def: {
          pages: [
            {
              controller: ControllerType.Repeat,
              path: '/personal_details'
            }
          ]
        },
        basePath: 'form/preview/draft/repeater-test'
      })
    )

    it('should return undefined if url does not end in a guid', () => {
      const mockContext = createMockContextWithPath(
        '/form/preview/draft/repeater-test/personal_details'
      )
      expect(checkSaveAndExitRepeater(mockContext, mockModel)).toBeUndefined()
    })

    it('should return undefined if url ends in a guid but not a repeater path', () => {
      const mockContext = createMockContextWithPath(
        '/form/preview/draft/repeater-test/wrong_page/7d27fe6e-73e8-4265-84bd-1e118c92470b'
      )
      expect(checkSaveAndExitRepeater(mockContext, mockModel)).toBeUndefined()
    })

    it('should return undefined if url is not a string', () => {
      // @ts-expect-error - invalid dataype on purpose for this test
      const mockContext = createMockContextWithPath({})
      expect(checkSaveAndExitRepeater(mockContext, mockModel)).toBeUndefined()
    })

    it('should return correct urls if url ends in a guid and is a repeater path', () => {
      const mockContext = createMockContextWithPath(
        '/form/preview/draft/repeater-test/personal_details/7d27fe6e-73e8-4265-84bd-1e118c92470b'
      )
      expect(checkSaveAndExitRepeater(mockContext, mockModel)).toBe(
        '/form/preview/draft/repeater-test/personal_details/7d27fe6e-73e8-4265-84bd-1e118c92470b'
      )
    })
  })
})

/**
 * @import { Page } from '@defra/forms-model'
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { AnyFormRequest, FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { FormQuery } from '~/src/server/routes/types.js'
 * @import { FormsService, Services } from '~/src/server/types.js'
 */
