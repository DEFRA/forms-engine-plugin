import { ControllerType, controllerNameFromPath } from '@defra/forms-model'

import { UnknownPageControllerError } from '~/src/server/plugins/engine/errors.js'
import * as PageControllers from '~/src/server/plugins/engine/pageControllers/index.js'

/**
 * @typedef {InstanceType<PageControllerType>} PageControllerClass
 */
/* eslint-disable jsdoc/valid-types -- the JSDoc type parser rejects indexed access on `typeof`; tsc reads it */
/**
 * @typedef {(typeof PageControllers)[keyof typeof PageControllers]} PageControllerType
 */
/* eslint-enable jsdoc/valid-types */

/**
 * Creates page instance for each {@link Page} type
 * @param {FormModel} model
 * @param {Page} pageDef
 * @returns {PageControllerClass}
 */
export function createPage(model, pageDef) {
  const controllerName = controllerNameFromPath(pageDef.controller)

  if (!pageDef.controller) {
    return new PageControllers.QuestionPageController(model, pageDef)
  }

  // Patch legacy controllers
  if (controllerName && pageDef.controller !== controllerName) {
    pageDef.controller = controllerName
  }

  /** @type {PageControllerClass | undefined} */
  let controller

  switch (pageDef.controller) {
    case ControllerType.Start:
      controller = new PageControllers.StartPageController(model, pageDef)
      break

    case ControllerType.Page:
      controller = new PageControllers.QuestionPageController(model, pageDef)
      break

    case ControllerType.Terminal:
      controller = new PageControllers.TerminalPageController(model, pageDef)
      break

    case ControllerType.Summary:
      controller = new PageControllers.SummaryPageController(model, pageDef)
      break

    case ControllerType.Status:
      controller = new PageControllers.StatusPageController(model, pageDef)
      break

    case ControllerType.FileUpload:
      controller = new PageControllers.FileUploadPageController(model, pageDef)
      break

    case ControllerType.Repeat:
      controller = new PageControllers.RepeatPageController(model, pageDef)
      break
  }

  if (typeof controller === 'undefined') {
    if (model.controllers?.[pageDef.controller]) {
      const Ctrl = model.controllers[pageDef.controller]
      controller = /** @type {PageControllerClass} */ (
        /** @type {unknown} */ (new Ctrl(model, pageDef))
      ) // type assertion needed because TS can't verify custom controller structure
    }
  }

  if (typeof controller === 'undefined') {
    throw new UnknownPageControllerError(pageDef.controller)
  }

  return controller
}

/**
 * @import { Page } from '@defra/forms-model'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 */
