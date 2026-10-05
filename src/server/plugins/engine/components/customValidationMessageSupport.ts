import { ComponentType } from '@defra/forms-model'

/**
 * Single source of truth for which component types apply the singular
 * `options.customValidationMessage` string and the plural
 * `options.customValidationMessages` map. Both
 * `customValidationMessage.test.ts` and `customValidationMessages.test.ts`
 * import these lists to verify engine behaviour, and
 * `scripts/generate-component-docs.js` imports them to keep the published
 * Options tables in step with that behaviour - a component listed here as
 * "ignores" gets its docs annotated or its row omitted instead of silently
 * documenting an option that does nothing.
 *
 * Each test file's 'accounts for every ComponentType' guard keeps its three
 * lists exhaustive, so an engine change that adds or removes support is
 * caught at the point these lists would otherwise go stale.
 */

/**
 * Component types that read `options.customValidationMessage` and apply it
 * in place of every translated validation message.
 */
export const SUPPORTS_SINGULAR_MESSAGE = [
  ComponentType.TextField,
  ComponentType.EmailAddressField,
  ComponentType.MultilineTextField,
  ComponentType.TelephoneNumberField,
  ComponentType.NumberField,
  ComponentType.OsGridRefField,
  ComponentType.NationalGridFieldNumberField,
  ComponentType.YesNoField
]

/**
 * Component types whose options type declares `customValidationMessage` but
 * whose engine code never reads it, so setting it has no effect.
 */
export const IGNORES_SINGULAR_MESSAGE = [
  ComponentType.EastingNorthingField,
  ComponentType.LatLongField,
  ComponentType.MonthYearField
]

/**
 * Component types with no `customValidationMessage` on their options type.
 * TypeScript itself proves the option cannot be set on these.
 */
export const NO_SINGULAR_MESSAGE_OPTION = [
  ComponentType.CheckboxesField,
  ComponentType.DatePartsField,
  ComponentType.UkAddressField,
  ComponentType.FileUploadField,
  ComponentType.DeclarationField,
  ComponentType.HiddenField,
  ComponentType.GeospatialField,
  ComponentType.PaymentField,
  ComponentType.RadiosField,
  ComponentType.SelectField,
  ComponentType.AutocompleteField,
  ComponentType.Details,
  ComponentType.Html,
  ComponentType.Markdown,
  ComponentType.InsetText,
  ComponentType.List,
  ComponentType.NotificationBanner
]

/**
 * Component types that read `options.customValidationMessages` and use it
 * in their Joi schema.
 */
export const SUPPORTS_PLURAL_MESSAGES = [
  ComponentType.TextField,
  ComponentType.EmailAddressField,
  ComponentType.MultilineTextField,
  ComponentType.TelephoneNumberField,
  ComponentType.NumberField,
  ComponentType.OsGridRefField,
  ComponentType.NationalGridFieldNumberField,
  ComponentType.YesNoField,
  ComponentType.RadiosField,
  ComponentType.SelectField,
  ComponentType.AutocompleteField
]

/**
 * Component types that never read options.customValidationMessages.
 * CheckboxesField reads it but then throws away that schema.
 */
export const IGNORES_PLURAL_MESSAGES = [
  ComponentType.CheckboxesField,
  ComponentType.DatePartsField,
  ComponentType.MonthYearField,
  ComponentType.EastingNorthingField,
  ComponentType.LatLongField,
  ComponentType.UkAddressField,
  ComponentType.FileUploadField,
  ComponentType.DeclarationField,
  ComponentType.HiddenField,
  ComponentType.GeospatialField,
  ComponentType.PaymentField
]

/**
 * Content-only component types. They have no user input and no validation,
 * so `options.customValidationMessages` does not apply to them.
 */
export const NO_PLURAL_MESSAGES_OPTION = [
  ComponentType.Details,
  ComponentType.Html,
  ComponentType.Markdown,
  ComponentType.InsetText,
  ComponentType.List,
  ComponentType.NotificationBanner
]
