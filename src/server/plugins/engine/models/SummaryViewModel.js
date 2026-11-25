import { SchemaVersion } from '@defra/forms-model'

import { PaymentField } from '~/src/server/plugins/engine/components/PaymentField.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import {
  evaluateTemplate,
  getError,
  getPageHref
} from '~/src/server/plugins/engine/helpers.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class SummaryViewModel {
  /**
   * Responsible for parsing state values to the govuk-frontend summary list template
   */

  /** @type {PageControllerClass} */
  page
  /** @type {string} */
  pageTitle
  /** @type {string | undefined} */
  declaration
  /** @type {Detail[]} */
  details
  /** @type {CheckAnswers[]} */
  checkAnswers
  /** @type {FormContext} */
  context
  /** @type {string | undefined} */
  name
  /** @type {BackLink | undefined} */
  backLink
  /** @type {string | undefined} */
  feedbackLink
  /** @type {string | undefined} */
  phaseTag
  /** @type {FormSubmissionError[] | undefined} */
  errors
  /** @type {string} */
  serviceUrl
  /** @type {boolean | undefined} */
  hasMissingNotificationEmail
  /** @type {ComponentViewModel[] | undefined} */
  components
  allowSaveAndExit = false
  /** @type {PaymentState | undefined} */
  paymentState
  /** @type {CheckAnswers | undefined} */
  paymentDetails
  /** @type {(key: string, opts?: Record<string, unknown>) => string} */
  t
  /**
   * @private
   * @readonly
   * @type {Translator}
   */
  _translator
  /** @type {boolean | undefined} */
  paymentRequired
  /** @type {boolean | undefined} */
  paymentPreAuthorized

  /**
   * @param {FormContextRequest} request
   * @param {PageControllerClass} page
   * @param {FormContext} context
   * @param {Translator} [translator]
   */
  constructor(
    request,
    page,
    context,
    translator = context.translator ?? page.model.createTranslator()
  ) {
    const { model } = page
    const { basePath, def, sections } = model
    const { isForceAccess } = context

    const { t } = translator
    this.t = t
    this._translator = translator

    this.page = page
    this.pageTitle = page.title
    if (def.schema === SchemaVersion.V2 && !page.title) {
      this.pageTitle = t('pages.summary.title')
    }

    this.serviceUrl = `/${basePath}`
    this.name = def.name
    this.declaration = def.declaration
    this.context = context

    const result = model
      .makeFilteredSchema(this.context.relevantPages)
      .validate(this.context.relevantState, { ...opts, stripUnknown: true })

    // Format errors
    this.errors = result.error?.details.map((item) =>
      getError(item, translator.language)
    )
    this.details = this.summaryDetails(request, sections, translator)

    // Format check answers
    this.checkAnswers = this.details.map(
      /** @returns {CheckAnswers} */
      (detail) => {
        const { title } = detail

        const rows = detail.items.map(
          /** @returns {SummaryListRow} */
          (item) => {
            /** @type {SummaryListAction[]} */
            const items = []

            // Remove summary list actions from previews
            if (!isForceAccess) {
              items.push({
                href: item.href,
                text: t('pages.summary.change'),
                classes: 'govuk-link--no-visited-state',
                visuallyHiddenText: item.label
              })
            }

            return {
              key: {
                text: evaluateTemplate(item.title, context)
              },
              value: {
                classes: 'app-prose-scope',
                html: item.value || t('pages.summary.notProvided')
              },
              actions: {
                items
              }
            }
          }
        )

        return {
          title: title ? { text: title } : undefined,
          summaryList: { rows }
        }
      }
    )
  }

  /**
   * @private
   * @param {FormContextRequest} request
   * @param {Section[]} sections
   * @param {Translator} translator
   */
  summaryDetails(request, sections, translator) {
    const { context, errors } = this
    const { relevantPages, state } = context

    /** @type {Detail[]} */
    const details = []

    ;[...sections, undefined].forEach((section) => {
      /** @type {DetailItem[]} */
      const items = []

      const sectionPages = relevantPages.filter(
        (page) => page.section === section
      )

      sectionPages.forEach((page) => {
        const { collection, path } = page

        if (page instanceof RepeatPageController) {
          items.push(
            ItemRepeat(
              page,
              state,
              {
                path: page.getSummaryPath(request),
                errors
              },
              translator
            )
          )
        } else {
          for (const field of collection.fields) {
            // PaymentField is rendered in its own section, skip it here
            if (field instanceof PaymentField) {
              continue
            }
            items.push(
              ItemField(page, state, field, { path, errors }, translator)
            )
          }
        }
      })

      if (items.length) {
        const sectionTitle = section
          ? translator.tSection(section, 'title') || section.title
          : undefined
        details.push({
          name: section?.name,
          title: sectionTitle,
          items
        })
      }
    })

    return details
  }
}

/**
 * Creates a repeater detail item
 * @see {@link DetailItemField}
 * @param {RepeatPageController} page
 * @param {FormState} state
 * @param {object} options
 * @param {string} options.path
 * @param {FormSubmissionError[]} [options.errors]
 * @param {Translator} translator
 * @returns {DetailItemRepeat}
 */
function ItemRepeat(page, state, options, translator) {
  const { collection, repeat } = page
  const { name } = repeat.options
  const { t, tPage } = translator
  const title = tPage(page.pageDef, 'repeatTitle') || repeat.options.title
  const values = page.getListFromState(state)
  const count = values.length
  const value = count === 0 ? '' : t('pages.repeater.pageTitle', { count })

  return {
    name,
    label: title,
    title,
    value,
    href: getPageHref(page, options.path, {
      returnUrl: getPageHref(page, page.getSummaryPath())
    }),
    state,
    page,

    // Repeater field detail items
    subItems: values.map((repeatState) =>
      collection.fields.map((field) =>
        ItemField(page, repeatState, field, options, translator)
      )
    )
  }
}

/**
 * Creates a form field detail item
 * @see {@link DetailItemField}
 * @param {PageControllerClass} page
 * @param {FormState} state
 * @param {Field} field
 * @param {object} options
 * @param {string} options.path
 * @param {FormSubmissionError[]} [options.errors]
 * @param {Translator} [translator]
 * @returns {DetailItemField}
 */
export function ItemField(
  page,
  state,
  field,
  options,
  translator = page.model.createTranslator()
) {
  // FormComponent doesn't expose shortDescription/title as raw def properties,
  // so build a lookup object with English values to let tComponent's GUID lookup fire.
  const fieldDef = /** @type {ComponentDef} */ (
    /** @type {unknown} */ ({
      id: field.id,
      type: field.type,
      shortDescription: field.label,
      title: field.title
    })
  )
  const rawLabel = translator.tComponent(fieldDef, 'shortDescription')
  const translatedLabel = rawLabel !== '' ? rawLabel : field.label
  const rawTitle = translator.tComponent(fieldDef, 'title')
  const translatedTitle = rawTitle !== '' ? rawTitle : field.title
  const optional =
    field.options.required === false
      ? ` ${translator.t('common.optional')}`
      : ''
  return {
    name: field.name,
    label: translatedTitle,
    title: `${translatedLabel}${optional}`,
    error: field.getFirstError(options.errors, translator),
    value: getAnswer(field, state, { format: 'summary' }, translator),
    href: getPageHref(page, options.path, {
      returnUrl: getPageHref(page, page.getSummaryPath())
    }),
    state,
    page,
    field
  }
}

/**
 * @import { ComponentDef, Section } from '@defra/forms-model'
 * @import { PaymentState } from '~/src/server/plugins/engine/components/PaymentField.types.js'
 * @import { Field } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { BackLink, ComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { Detail, DetailItem, DetailItemField, DetailItemRepeat } from '~/src/server/plugins/engine/models/types.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { CheckAnswers, FormContext, FormContextRequest, FormState, FormSubmissionError, SummaryListAction, SummaryListRow } from '~/src/server/plugins/engine/types.js'
 */
