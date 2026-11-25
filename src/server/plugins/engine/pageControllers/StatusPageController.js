import { getCacheService } from '~/src/server/plugins/engine/helpers.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

export class StatusPageController extends QuestionPageController {
  /** @type {PageStatus} */
  // @ts-expect-error TS2729: the base constructor has already set it
  pageDef = this.pageDef

  allowSaveAndExit = false
  showReferenceNumber = false

  /**
   * @param {FormModel} model
   * @param {PageStatus} pageDef
   */
  constructor(model, pageDef) {
    super(model, pageDef)
    this.viewName = 'confirmation'
    this.showReferenceNumber = model.def.options?.showReferenceNumber ?? false
  }

  getRelevantPath() {
    return this.getStatusPath()
  }

  makeGetRouteHandler() {
    /**
     * @param {FormRequest} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return async (request, context, h) => {
      const { viewModel, viewName } = this

      const language = resolveLanguage(request)
      const translator = this.model.createTranslator(language)
      const { t, tForm, tPage } = translator

      const cacheService = getCacheService(request.server)
      const confirmationState = await cacheService.getConfirmationState(request)

      // If there's no confirmation state, then
      // redirect the user back to the start of the form
      if (!confirmationState.confirmed) {
        return this.proceed(request, h, this.getStartPath())
      }

      const slug = request.params.slug
      const { formsService } = this.model.services
      const { getFormMetadata, getFormMetadataById } = formsService

      const { submissionGuidance } = await getFormMetadata(slug)

      // Re-read form name if overriding display (for example, in a feedback form)
      const storedFormId = confirmationState.formId
      const formName = storedFormId
        ? (await getFormMetadataById(storedFormId)).title
        : undefined

      return h.view(viewName, {
        ...viewModel,
        pageTitle: tPage(this.pageDef, 'title'),
        formName,
        submissionGuidance,
        showReferenceNumber: this.showReferenceNumber,
        referenceNumber: confirmationState.referenceNumber,
        t,
        tForm,
        context
      })
    }
  }
}

/**
 * @import { PageStatus } from '@defra/forms-model'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
