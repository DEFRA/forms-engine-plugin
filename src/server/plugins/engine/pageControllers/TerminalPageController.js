import Boom from '@hapi/boom'

import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'

export class TerminalPageController extends QuestionPageController {
  /** @type {PageTerminal} */
  // @ts-expect-error TS2729: the base constructor has already set it
  pageDef = this.pageDef

  allowSaveAndExit = false

  // eslint-disable-next-line jsdoc/require-returns-check -- the method only throws; the return type is what subclasses implement
  /**
   * @returns {(request: FormRequestPayload, context: FormContext, h: FormResponseToolkit) => Promise<ResponseObject>}
   */
  makePostRouteHandler() {
    throw Boom.methodNotAllowed('POST method not allowed for terminal pages')
  }
}

/**
 * @import { PageTerminal } from '@defra/forms-model'
 * @import { ResponseObject } from '@hapi/hapi'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
