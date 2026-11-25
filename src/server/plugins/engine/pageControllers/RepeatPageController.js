import { randomUUID } from 'crypto'

import Boom from '@hapi/boom'
import Joi from 'joi'

import { isRepeatState } from '~/src/server/plugins/engine/components/FormComponent.js'
import { redirectPath } from '~/src/server/plugins/engine/helpers.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { FormAction } from '~/src/server/routes/types.js'

export class RepeatPageController extends QuestionPageController {
  /** @type {PageRepeat} */
  // @ts-expect-error TS2729: the base constructor has already set it
  pageDef = this.pageDef

  listSummaryViewName = 'repeat-list-summary'
  listDeleteViewName = 'item-delete'

  /** @type {Repeat} */
  repeat

  allowSaveAndExit = true

  /**
   * @param {FormModel} model
   * @param {PageRepeat} pageDef
   */
  constructor(model, pageDef) {
    super(model, pageDef)

    this.repeat = pageDef.repeat

    const { options, schema } = this.repeat
    const itemId = Joi.string().uuid().required()

    this.collection.formSchema = this.collection.formSchema.append({ itemId })
    this.collection.stateSchema = /** @type {ObjectSchema<RepeatItemState>} */ (
      Joi.object()
    ).keys({
      [options.name]: Joi.array()
        .items(this.collection.stateSchema.append({ itemId }))
        .min(schema.min)
        .max(schema.max)
        .label(`${options.title} list`)
        .required()
    })
  }

  get keys() {
    const { repeat } = this
    return [repeat.options.name, ...super.keys]
  }

  /**
   * @param {FormContextRequest} [request]
   */
  getFormParams(request) {
    const params = super.getFormParams(request)

    // Apply an itemId to the form payload
    if (request?.payload) {
      params.itemId = request.params.itemId ?? randomUUID()
    }

    return params
  }

  /**
   * @param {FormContextRequest | undefined} request
   * @param {FormSubmissionState} state
   */
  getFormDataFromState(request, state) {
    const { repeat } = this

    const params = this.getFormParams(request)
    const list = this.getListFromState(state)
    const itemId = this.getItemId(request)

    // Create payload with repeater list state
    if (!itemId) {
      return {
        ...params,
        [repeat.options.name]: list
      }
    }

    // Create payload with repeater item state
    const item = this.getItemFromList(list, itemId)

    // A question previously stored in the item may have been removed so run through
    // `collection.getFormDataFromState` to filter to only the current components
    const itemPayload = item ? this.collection.getFormDataFromState(item) : {}

    return {
      ...params,
      ...itemPayload
    }
  }

  /**
   * @param {FormContextRequest} request
   * @param {FormSubmissionState} state
   * @param {FormPayload} payload
   */
  getStateFromValidForm(request, state, payload) {
    const itemId = this.getItemId(request)

    if (!itemId) {
      throw Boom.badRequest('No item ID found')
    }

    const list = this.getListFromState(state)
    const item = this.getItemFromList(list, itemId)

    const itemState = super.getStateFromValidForm(request, state, payload)
    /** @type {RepeatItemState} */
    const updated = { ...itemState, itemId }
    const newList = [...list]

    if (!item) {
      // Adding a new item
      newList.push(updated)
    } else {
      // Update an existing item
      newList[list.indexOf(item)] = updated
    }

    return {
      [this.repeat.options.name]: newList
    }
  }

  /**
   * @param {FormContextRequest} request
   * @param {FormResponseToolkit} h
   */
  proceed(request, h) {
    const nextPath = this.getSummaryPath(request)
    return super.proceed(request, h, nextPath)
  }

  /**
   * @param {RepeatListState} list
   * @param {string} [itemId]
   */
  getItemFromList(list, itemId) {
    return list.find((item) => item.itemId === itemId)
  }

  /**
   * @param {FormSubmissionState} state
   */
  getListFromState(state) {
    const { name } = this.repeat.options
    const values = state[name]

    return isRepeatState(values) ? values : []
  }

  makeGetRouteHandler() {
    /**
     * @param {FormRequest} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return async (request, context, h) => {
      const { path } = this
      const { query } = request
      const { state } = context

      const itemId = this.getItemId(request)
      const list = this.getListFromState(state)

      if (!itemId) {
        const summaryPath = this.getSummaryPath(request)
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl,
          force: query.force
        })

        // Only redirect to new item when list is empty
        return super.proceed(request, h, list.length ? summaryPath : nextPath)
      }

      return super.makeGetRouteHandler()(request, context, h)
    }
  }

  makeGetListSummaryRouteHandler() {
    /**
     * @param {FormRequest} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return (request, context, h) => {
      const { path } = this
      const { query } = request
      const { state } = context

      const list = this.getListFromState(state)

      if (!list.length) {
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl
        })

        return super.proceed(request, h, nextPath)
      }

      // Check if any items in the list are invalid and redirect to the first invalid item.
      // This is to ensure that the user is aware of any errors in the list before proceeding to the next page.
      // This situation can occur when reusing answers from a previous submission but the questions have changed and the answers are no longer valid.
      // It can also happen if a repeater contains a declaration component which are explicitly excluded when copying a previous submission to a new submission, resulting in the repeater items being invalid.
      const result = this.collection.stateSchema.validate(
        this.getFormDataFromState(request, context.state)
      )

      if (result.error) {
        const firstInvalidItemIndex = result.error.details[0].path[1]

        if (typeof firstInvalidItemIndex === 'number') {
          const firstInvalidItem = list[firstInvalidItemIndex]

          const nextPath = redirectPath(`${path}/${firstInvalidItem.itemId}`, {
            returnUrl: query.returnUrl,
            force: query.force
          })

          return super.proceed(request, h, nextPath)
        }
      }

      const translator = this.getTranslator(request)
      const { t } = translator

      const viewModel = this.getListSummaryViewModel(
        request,
        context,
        list,
        translator
      )

      return h.view(this.listSummaryViewName, {
        ...viewModel,
        t
      })
    }
  }

  makePostListSummaryRouteHandler() {
    /**
     * @param {FormRequestPayload} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return (request, context, h) => {
      const { path, repeat } = this
      const { query } = request
      const { schema } = repeat
      const { state } = context

      const list = this.getListFromState(state)

      if (!list.length) {
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl
        })

        return super.proceed(request, h, nextPath)
      }

      const translator = this.getTranslator(request)
      const { t } = translator

      const { action } = this.getFormParams(request)

      const hasErrorMin =
        action === FormAction.Continue && list.length < schema.min

      const hasErrorMax =
        (action === FormAction.AddAnother && list.length >= schema.max) ||
        (action === FormAction.Continue && list.length > schema.max)

      // Show error if repeat limits apply
      if (hasErrorMin || hasErrorMax) {
        const count = hasErrorMax ? schema.max : schema.min

        context.errors = [
          {
            path: [],
            href: '',
            name: '',
            text: hasErrorMax
              ? t('pages.repeater.tooMany', { count })
              : t('pages.repeater.tooFew', { count })
          }
        ]

        const viewModel = this.getListSummaryViewModel(
          request,
          context,
          list,
          translator
        )

        return h.view(this.listSummaryViewName, {
          ...viewModel,
          t
        })
      }

      if (action === FormAction.AddAnother) {
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl
        })

        return super.proceed(request, h, nextPath)
      }

      // Check if this is a save-and-exit action
      if (action === FormAction.SaveAndExit) {
        return this.handleSaveAndExit(request, context, h)
      }

      const nextPath = this.getNextPath(context)
      return super.proceed(request, h, nextPath)
    }
  }

  makeGetItemDeleteRouteHandler() {
    /**
     * @param {FormRequest} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return (request, context, h) => {
      const { viewModel } = this
      const { state } = context

      const list = this.getListFromState(state)
      const itemId = this.getItemId(request)
      const item = this.getItemFromList(list, itemId)

      const translator = this.getTranslator(request)
      const { t } = translator

      if (!item || list.length === 1) {
        throw Boom.notFound(
          item
            ? t('pages.repeater.lastItemCannotBeRemoved')
            : t('pages.repeater.itemToRemoveNotFound')
        )
      }

      const { title } = this.repeat.options

      return h.view(
        this.listDeleteViewName,
        /** @satisfies {ItemDeletePageViewModel} */ ({
          ...viewModel,
          context,
          backLink: this.getBackLink(request, context, t),
          pageTitle: t('pages.repeater.removeAnswer'),
          itemTitle: `${title} ${list.indexOf(item) + 1}`,
          buttonConfirm: { text: t('pages.repeater.remove') },
          buttonCancel: { text: t('pages.repeater.cancel') },
          t
        })
      )
    }
  }

  makePostItemDeleteRouteHandler() {
    /**
     * @param {FormRequestPayload} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return async (request, context, h) => {
      const { repeat } = this
      const { state } = context

      const { confirm } = this.getFormParams(request)

      const list = this.getListFromState(state)
      const itemId = this.getItemId(request)
      const item = this.getItemFromList(list, itemId)

      const { t } = this.getTranslator(request)

      if (!item || list.length === 1) {
        throw Boom.notFound(
          item
            ? t('pages.repeater.lastItemCannotBeRemoved')
            : t('pages.repeater.itemToRemoveNotFound')
        )
      }

      // Remove the item from the list
      if (confirm) {
        list.splice(list.indexOf(item), 1)

        const update = {
          [repeat.options.name]: list
        }

        await this.mergeState(request, state, update)
      }

      return this.proceed(request, h)
    }
  }

  /**
   * @param {FormContextRequest} request
   * @param {FormContext} context
   * @param {Translator} [translator]
   * @returns {FormPageViewModel}
   */
  getViewModel(
    request,
    context,
    translator = context.translator ?? this.model.createTranslator()
  ) {
    const { state } = context
    const { tPage } = translator

    const list = this.getListFromState(state)
    const itemId = this.getItemId(request)
    const item = this.getItemFromList(list, itemId)

    const viewModel = super.getViewModel(request, context, translator)
    const itemNumber = item ? list.indexOf(item) + 1 : list.length + 1
    const title =
      tPage(this.pageDef, 'repeatTitle') || this.pageDef.repeat.options.title
    const repeatCaption = `${title} ${itemNumber}`

    return {
      ...viewModel,

      sectionTitle: viewModel.sectionTitle
        ? `${viewModel.sectionTitle}: ${repeatCaption}`
        : repeatCaption
    }
  }

  /**
   * @param {FormContextRequest} request
   * @param {FormContext} context
   * @param {RepeatListState} list
   * @param {Translator} [translator]
   * @returns {RepeaterSummaryPageViewModel}
   */
  getListSummaryViewModel(
    request,
    context,
    list,
    translator = context.translator ?? this.model.createTranslator()
  ) {
    const { collection, href, repeat } = this
    const { query } = request
    const { isForceAccess, errors } = context

    const { t, tPage } = translator

    const title = tPage(this.pageDef, 'repeatTitle') || repeat.options.title

    /** @type {SummaryList} */
    const summaryList = {
      classes: 'govuk-summary-list--long-actions',
      rows: []
    }

    let count = 0

    if (Array.isArray(list)) {
      count = list.length

      const summaryPath = this.getSummaryPath(request)

      list.forEach((item, index) => {
        /** @type {SummaryListAction[]} */
        const items = []

        // Remove summary list actions from previews
        if (!isForceAccess) {
          items.push({
            href: redirectPath(`${href}/${item.itemId}`, {
              returnUrl: query.returnUrl ?? this.getHref(summaryPath)
            }),
            text: t('pages.repeater.change'),
            classes: 'govuk-link--no-visited-state',
            visuallyHiddenText: t('pages.repeater.visuallyHiddenItem', {
              index: index + 1
            })
          })

          if (count > 1) {
            items.push({
              href: redirectPath(`${href}/${item.itemId}/confirm-delete`, {
                returnUrl: query.returnUrl
              }),
              text: t('pages.repeater.remove'),
              classes: 'govuk-link--no-visited-state',
              visuallyHiddenText: t('pages.repeater.visuallyHiddenItem', {
                index: index + 1
              })
            })
          }
        }

        const itemDisplayText = collection.fields.length
          ? collection.fields[0].getDisplayStringFromState(item, translator)
          : ''

        summaryList.rows.push({
          key: {
            text: `${title} ${index + 1}`
          },
          value: {
            text: itemDisplayText || t('pages.repeater.notProvided')
          },
          actions: {
            items
          }
        })
      })
    }

    return {
      ...this.viewModel,
      backLink: this.getBackLink(request, context, t),
      repeatTitle: title,
      pageTitle: t('pages.repeater.pageTitle', { count }),
      showTitle: true,
      context,
      errors,
      checkAnswers: [{ summaryList }],
      allowSaveAndExit: this.shouldShowSaveAndExit(request.server)
    }
  }

  /**
   * @param {FormContextRequest} [request]
   */
  getSummaryPath(request) {
    const { path } = this

    const summaryPath = super.getSummaryPath()

    if (!request) {
      return summaryPath
    }

    const { query } = request

    return redirectPath(`${path}${summaryPath}`, {
      returnUrl: query.returnUrl
    })
  }
}

/**
 * @import { PageRepeat, Repeat } from '@defra/forms-model'
 * @import { ObjectSchema } from 'joi'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { FormContext, FormContextRequest, FormPageViewModel, FormPayload, FormSubmissionState, ItemDeletePageViewModel, RepeatItemState, RepeatListState, RepeaterSummaryPageViewModel, SummaryList, SummaryListAction } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
