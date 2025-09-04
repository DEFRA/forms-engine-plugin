import { type PageTerminal } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseObject } from '@hapi/hapi'

import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequestPayload,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'

export class TerminalPageController extends QuestionPageController {
  declare pageDef: PageTerminal
  allowSaveAndExit = false

  makePostRouteHandler(): (
    request: FormRequestPayload,
    context: FormContext,
    h: FormResponseToolkit
  ) => Promise<ResponseObject> {
    throw Boom.methodNotAllowed('POST method not allowed for terminal pages')
  }
}
