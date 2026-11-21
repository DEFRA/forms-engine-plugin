/**
 * The values a component renders from. The translator defaults to English,
 * so that a form with no translations renders without one.
 * @typedef {{
 *   payload: FormPayload
 *   errors?: FormSubmissionError[]
 *   query?: FormQuery
 *   translator?: Translator
 * }} RenderContext
 */

/**
 * @typedef {{
 *   classes?: string
 *   attributes?: string | Record<string, string>
 * } & (
 *   {
 *     text: string
 *     html?: string
 *   } | {
 *     text?: string
 *     html: string
 *   }
 * )} ComponentText
 */

/**
 * @typedef {{
 *   text: string
 *   classes?: string
 *   html?: string
 *   isPageHeading?: boolean
 * }} Label
 */

/**
 * @typedef {{
 *   title?: string
 *   text: string
 *   condition?: string
 * }} Content
 */

/**
 * @typedef {{
 *   text: string
 *   href: string
 * }} BackLink
 */

/**
 * @typedef {Omit<Label, 'text' | 'isPageHeading'>} ListItemLabel
 */

/**
 * @typedef {{
 *   text?: string
 *   value?: Item['value']
 *   hint?: {
 *     id?: string
 *     text: string
 *   }
 *   checked?: boolean
 *   selected?: boolean
 *   label?: ListItemLabel
 *   condition?: string
 * }} ListItem
 */

/* eslint-disable jsdoc/require-property-description -- only the members with a comment in the source have a description */
/**
 * @typedef {object} DateInputItem
 * @property {Label} [label]
 * @property {string} [type]
 * @property {string} [id]
 * @property {string} [name]
 * @property {Item['value']} [value]
 * @property {string} [classes]
 * @property {ComponentText} [prefix] - Prefix/suffix are used by location fields (e.g., LatLong, EastingNorthing) for units like "°"
 *   but not by date fields. This interface is reused by both component types.
 * @property {ComponentText} [suffix]
 * @property {{ text: string }} [errorMessage]
 * @property {undefined} [condition]
 */
/* eslint-enable jsdoc/require-property-description */

/**
 * @typedef {Record<string, unknown> & {
 *   label?: Label
 *   type?: string
 *   id?: string
 *   name?: string
 *   value?: FormValue
 *   hint?: {
 *     id?: string
 *     text: string
 *   }
 *   prefix?: ComponentText
 *   suffix?: ComponentText
 *   classes?: string
 *   condition?: string
 *   errors?: FormSubmissionError[]
 *   errorMessage?: {
 *     text: string
 *   }
 *   summaryHtml?: string
 *   html?: string
 *   attributes: {
 *     autocomplete?: string
 *     maxlength?: number
 *     multiple?: string
 *     accept?: string
 *     inputmode?: string
 *   }
 *   content?: Content | Content[] | string
 *   maxlength?: number
 *   maxwords?: number
 *   rows?: number
 *   items?: ListItem[] | DateInputItem[]
 *   fieldset?: {
 *     attributes?: string | Record<string, string>
 *     legend?: Label
 *   }
 *   formGroup?: {
 *     classes?: string
 *     attributes?: string | Record<string, string>
 *   }
 *   showFieldsetError?: boolean
 *   components?: ComponentViewModel[]
 *   upload?: {
 *     count: number
 *     summaryList: SummaryList
 *     uploadingLabel?: string
 *   }
 * }} ViewModel
 */

/**
 * @typedef {{
 *   type: ComponentType
 *   isFormComponent: boolean
 *   model: ViewModel
 * }} ComponentViewModel
 */

/**
 * @typedef {Record<string, number> & {
 *   day: number
 *   month: number
 *   year: number
 * }} DatePartsState
 */

/**
 * @typedef {Record<string, number> & {
 *   month: number
 *   year: number
 * }} MonthYearState
 */

/**
 * @typedef {Record<string, number> & {
 *   easting: number
 *   northing: number
 * }} EastingNorthingState
 */

/**
 * @typedef {Record<string, number> & {
 *   latitude: number
 *   longitude: number
 * }} LatLongState
 */

/**
 * @import { ComponentType, Item } from '@defra/forms-model'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormPayload, FormSubmissionError, FormValue, SummaryList } from '~/src/server/plugins/engine/types.js'
 * @import { FormQuery } from '~/src/server/routes/types.js'
 */
