import { ControllerPath } from '@defra/forms-model'
import Boom from '@hapi/boom'

import {
  getSaveAndExitHelpers,
  getStartPath,
  normalisePath
} from '~/src/server/plugins/engine/helpers.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

export class PageController {
  /**
   * The base class for all page controllers. Page controllers are responsible for generating the get and post route handlers when a user navigates to `/{id}/{path*}`.
   * @type {FormDefinition}
   */
  def

  /** @type {string | undefined} */
  name

  /** @type {FormModel} */
  model

  /** @type {Page} */
  pageDef

  /** @type {string | undefined} */
  id

  /** @type {string} */
  title

  /** @type {Section | undefined} */
  section

  /** @type {ExecutableCondition | undefined} */
  condition

  /** @type {Events | undefined} */
  events

  /** @type {ComponentCollection | undefined} */
  collection

  viewName = 'index'
  allowSaveAndExit = false

  /**
   * @param {FormModel} model
   * @param {Page} pageDef
   */
  constructor(model, pageDef) {
    const { def } = model

    this.def = def
    this.name = def.name
    this.model = model
    this.pageDef = pageDef
    this.id = pageDef.id
    this.title = pageDef.title
    this.events = pageDef.events

    // Resolve section
    if (pageDef.section) {
      this.section = model.getSection(pageDef.section)
    }

    // Resolve condition
    if (pageDef.condition) {
      this.condition = model.conditions[pageDef.condition]
    }

    // Override view name
    if (pageDef.view) {
      this.viewName = pageDef.view
    }
  }

  get path() {
    return this.pageDef.path
  }

  get href() {
    const { path } = this
    return this.getHref(`/${normalisePath(path)}`)
  }

  get keys() {
    return this.collection?.keys ?? []
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   * @returns {RouteOptions<FormRequestRefs>}
   */
  get getRouteOptions() {
    return {}
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   * @returns {RouteOptions<FormRequestPayloadRefs>}
   */
  get postRouteOptions() {
    return {}
  }

  /**
   * @returns {PageViewModelBase}
   */
  get viewModel() {
    const { name, section, title } = this

    const showTitle = true
    const pageTitle = title
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''

    return {
      name,
      page: this,
      pageTitle,
      sectionTitle,
      showTitle,
      isStartPage: false,
      serviceUrl: this.getHref('/'),
      feedbackLink: this.feedbackLink,
      phaseTag: this.phaseTag
    }
  }

  get feedbackLink() {
    return this.def.options?.disableUserFeedback
      ? undefined
      : `/form/feedback?formId=${this.model.formId}`
  }

  get phaseTag() {
    const { def } = this
    return def.phaseBanner?.phase
  }

  /**
   * @param {string} path
   * @returns {string}
   */
  getHref(path) {
    const basePath = this.model.basePath

    if (path === '/') {
      return `/${basePath}`
    }

    // if ever the path is not prefixed with a slash, add it
    const relativeTargetPath = path.startsWith('/') ? path.substring(1) : path
    let finalPath = `/${basePath}`
    if (relativeTargetPath) {
      finalPath += `/${relativeTargetPath}`
    }
    finalPath = finalPath.replace(/\/{2,}/g, '/')

    return finalPath
  }

  getStartPath() {
    return getStartPath(this.model)
  }

  getSummaryPath() {
    return ControllerPath.Summary.valueOf()
  }

  getStatusPath() {
    return ControllerPath.Status.valueOf()
  }

  /**
   * @protected
   * @param {AnyFormRequest} request
   * @returns {Translator}
   */
  getTranslator(request) {
    return this.model.createTranslator(resolveLanguage(request))
  }

  /**
   * @returns {(request: FormRequest, context: FormContext, h: FormResponseToolkit) => ReturnType<Lifecycle.Method<FormRequestRefs>>}
   */
  makeGetRouteHandler() {
    return (request, context, h) => {
      const { viewModel, viewName } = this
      const { t } = this.getTranslator(request)
      return h.view(viewName, {
        ...viewModel,
        t
      })
    }
  }

  // eslint-disable-next-line jsdoc/require-returns-check -- the method only throws; the return type is what subclasses implement
  /**
   * @returns {(request: FormRequestPayload, context: FormContext, h: FormResponseToolkit) => ReturnType<Lifecycle.Method<FormRequestPayloadRefs>>}
   */
  makePostRouteHandler() {
    throw Boom.badRequest('Unsupported POST route handler for this page')
  }

  /**
   * Get supplementary state keys for clearing component state.
   *
   * This method returns page controller-level state keys only. The core component's
   * state key (the component's name) is managed separately by the framework and should
   * NOT be included in the returned array.
   *
   * Returns an empty array by default. Override in subclasses to provide
   * page-specific supplementary state keys (e.g., upload state, cached data).
   * @param {FormComponent} [_component] - The component to get supplementary state keys for (optional)
   * @returns {string[]} Array of supplementary state keys to clear (excluding the component name itself)
   */
  getStateKeys(_component) {
    return []
  }

  /**
   * @param {Server} server
   * @returns {boolean}
   */
  shouldShowSaveAndExit(server) {
    return getSaveAndExitHelpers(server) !== undefined && this.allowSaveAndExit
  }
}

/**
 * @import { Events, FormDefinition, Page, Section } from '@defra/forms-model'
 * @import { Lifecycle, RouteOptions, Server } from '@hapi/hapi'
 * @import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
 * @import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { ExecutableCondition } from '~/src/server/plugins/engine/models/types.js'
 * @import { AnyFormRequest, FormContext, PageViewModelBase } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormRequestPayloadRefs, FormRequestRefs, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
