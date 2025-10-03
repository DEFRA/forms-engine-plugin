import {
  ControllerType,
  type PageSummaryWithConfirmationEmail
} from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  SummaryPageWithConfirmationEmailController,
  addUserConfirmationEmailAddress
} from '~/src/server/plugins/engine/pageControllers/SummaryPageWithConfirmationEmailController.js'
import { buildFormRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/cacheService.js'
import definition from '~/test/form/definitions/basic.js'

describe('SummaryPageWithConfirmationEmailController', () => {
  let model: FormModel
  let controller: SummaryPageWithConfirmationEmailController
  let requestPage: FormRequest

  const response = {
    code: jest.fn().mockImplementation(() => response)
  }
  const h: FormResponseToolkit = {
    redirect: jest.fn().mockReturnValue(response),
    view: jest.fn()
  }

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    // Create a mock page for SummaryPageWithConfirmationEmailController
    const mockPage = {
      ...definition.pages[0],
      controller: ControllerType.SummaryWithConfirmationEmail
    } as unknown as PageSummaryWithConfirmationEmail

    controller = new SummaryPageWithConfirmationEmailController(model, mockPage)

    requestPage = buildFormRequest({
      method: 'get',
      url: new URL('http://example.com/test/summary'),
      path: '/test/summary',
      params: {
        path: 'summary',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest)
  })

  describe('handle errors', () => {
    it('should display errors including summary', async () => {
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        licenceLength: 365,
        fullName: 'John Smith'
      }
      const request = {
        ...requestPage,
        method: 'post',
        payload: { invalid: '123', action: 'send' }
      } as unknown as FormRequestPayload

      const context = model.getFormContext(request, state)

      jest.spyOn(controller, 'getState').mockResolvedValue({})
      jest.spyOn(controller, 'setState').mockResolvedValue(state)

      const postHandler = controller.makePostRouteHandler()
      await postHandler(request, context, h)

      const viewModel = controller.getSummaryViewModel(request, context)

      expect(h.view).toHaveBeenCalledWith('summary', expect.anything())
      expect(viewModel.errors).toHaveLength(1)
      const errorText = viewModel.errors ? viewModel.errors[0].text : ''
      expect(errorText).toBe('invalid is not allowed')
    })
  })

  describe('handleSaveAndExit', () => {
    it('should invoke saveAndExit plugin option', async () => {
      const saveAndExitMock = jest.fn(() => ({}))
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        licenceLength: 365,
        fullName: 'John Smith'
      }
      const request = {
        ...requestPage,
        server: {
          plugins: {
            'forms-engine-plugin': {
              saveAndExit: saveAndExitMock,
              cacheService: {
                clearState: jest.fn()
              } as unknown as CacheService
            }
          }
        },
        method: 'post',
        payload: { fullName: 'John Smith', action: 'save-and-exit' }
      } as unknown as FormRequestPayload

      const context = model.getFormContext(request, state)

      const postHandler = controller.makePostRouteHandler()
      await postHandler(request, context, h)

      expect(saveAndExitMock).toHaveBeenCalledWith(request, h, context)
    })
  })

  describe('addUserConfirmationEmailAddress', () => {
    const confirmationEmailField = {
      hint: 'Enter your email address to get an email confirming your form has been submitted',
      id: '20f50a94-2c35-466c-b802-9215753b383b',
      name: 'userConfirmationEmailAddress',
      options: {
        required: false
      },
      shortDescription: 'Email address',
      title: 'Confirmation email',
      type: 'EmailAddressField'
    }

    test('should add confirmation email', () => {
      const pageDef = {
        components: [],
        path: '/summary',
        controller: ControllerType.SummaryWithConfirmationEmail,
        title: 'Summary'
      } as PageSummaryWithConfirmationEmail
      addUserConfirmationEmailAddress(pageDef)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const components = pageDef.components ?? []
      expect(components).toHaveLength(1)
      expect(components).toEqual([confirmationEmailField])
    })

    test('should not add confirmation email if already exists', () => {
      const pageDef = {
        components: [confirmationEmailField],
        path: '/summary',
        controller: ControllerType.SummaryWithConfirmationEmail,
        title: 'Summary'
      } as PageSummaryWithConfirmationEmail
      addUserConfirmationEmailAddress(pageDef)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const components = pageDef.components ?? []
      expect(components).toHaveLength(1)
    })

    test('should insert just before declaration', () => {
      const pageDef = {
        components: [
          { type: 'TextField' },
          { type: 'RadiosField' },
          { type: 'Markdown' }
        ],
        path: '/summary',
        controller: ControllerType.SummaryWithConfirmationEmail,
        title: 'Summary'
      } as PageSummaryWithConfirmationEmail
      addUserConfirmationEmailAddress(pageDef)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const components = pageDef.components ?? []
      expect(components).toHaveLength(4)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      const fieldTypes = components.map((x) => x.type)
      expect(fieldTypes).toEqual([
        'TextField',
        'RadiosField',
        'EmailAddressField',
        'Markdown'
      ])
    })
  })
})
