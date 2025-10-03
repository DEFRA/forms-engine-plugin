import {
  ComponentType,
  hasComponentsEvenIfNoNext,
  type ComponentDef,
  type Page
} from '@defra/forms-model'
import findLastIndex from 'lodash/findLastIndex.js'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { SummaryPageController } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'

export const CONFIRMATION_EMAIL_GUID = '20f50a94-2c35-466c-b802-9215753b383b'

export class SummaryPageWithConfirmationEmailController extends SummaryPageController {
  constructor(model: FormModel, pageDef: Page) {
    addUserConfirmationEmailAddress(pageDef)
    super(model, pageDef)
  }
}

export function addUserConfirmationEmailAddress(pageDef: Page) {
  if (hasComponentsEvenIfNoNext(pageDef)) {
    // Abort if already added
    if (
      pageDef.components.some((comp) => comp.id === CONFIRMATION_EMAIL_GUID)
    ) {
      return
    }

    const userConfirmationEmailAddress = {
      title: 'Confirmation email',
      shortDescription: 'Email address',
      id: CONFIRMATION_EMAIL_GUID,
      name: 'userConfirmationEmailAddress',
      type: ComponentType.EmailAddressField,
      hint: 'Enter your email address to get an email confirming your form has been submitted',
      options: {
        required: false
      }
    } as ComponentDef

    const declarationPos = findLastIndex(
      pageDef.components,
      (comp) => comp.type === ComponentType.Markdown
    )
    if (declarationPos > -1) {
      pageDef.components.splice(declarationPos, 0, userConfirmationEmailAddress)
    } else {
      pageDef.components.push(userConfirmationEmailAddress)
    }
  }
}
