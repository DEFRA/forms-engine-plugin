import {
  ComponentType,
  type EastingNorthingFieldComponent,
  type EmailAddressFieldComponent,
  type LatLongFieldComponent,
  type MonthYearFieldComponent,
  type MultilineTextFieldComponent,
  type NationalGridFieldNumberFieldComponent,
  type NumberFieldComponent,
  type OsGridRefFieldComponent,
  type TelephoneNumberFieldComponent,
  type TextFieldComponent,
  type YesNoFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormPayload } from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData } from '~/test/helpers/component-helpers.js'

/**
 * Composite fields (EastingNorthingField, ...) use flat payload keys, e.g.
 * `myComponent__easting`. They do not nest an object under `myComponent`.
 * Each component's own test file uses the same format.
 */
function getCompositeFormData(fields: Record<string, string>): FormPayload {
  const data: FormPayload = {}

  for (const [key, value] of Object.entries(fields)) {
    data[`myComponent__${key}`] = value
  }

  return data
}

/**
 * Each component has its own test file for schema, state and view model
 * checks. This file has one job: check the singular `options.customValidationMessage`
 * string (it applies to every key in a component's schema) for every
 * component type, in two ways:
 * - `validate(input)` - a plain unit test, no translator.
 * - `validate(input, translator)` - matches a real request. `FormModel.ts`
 *   always passes a translator when it validates form input.
 *
 * Support for the plural `options.customValidationMessages` map is not the
 * same as support for this singular option, so that option has its own test
 * file: customValidationMessages.test.ts.
 *
 * The lists below record which components declare and read this option.
 * They come from reading each component's source code and its
 * `@defra/forms-model` type, not from guessing. Only 11 of the 28
 * ComponentType values declare customValidationMessage on their options
 * type at all - the other 17 cannot express it, so TypeScript itself proves
 * the option does not apply to them. No runtime test is needed for those;
 * they are listed below only so the coverage guard test accounts for every
 * ComponentType.
 *
 * Fixed regression: NumberField, OsGridRefField and NationalGridFieldNumberField
 * worked in v4.23.0 (the last v4 release, which had no
 * `getValidationMessagesOverride()` and no translator argument on
 * `validate()`). In v5, `getValidationMessagesOverride()` always replaced the
 * author's message with a translated default at request time, breaking the
 * option. `withCustomValidationOverrides()` (components/helpers/index.ts) now
 * builds the override from the author's message when one is set.
 *
 * Not a regression: YesNoField never supported the option in v4.23.0.
 */

const CUSTOM = 'This is a custom validation message'

/**
 * Component types that declare customValidationMessage on their options
 * type and read it. Tested below under 'Supported'.
 */
const SUPPORTS_SINGULAR_MESSAGE = [
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
 * Component types that declare customValidationMessage on their options
 * type but never read it. Tested below under 'Not supported'.
 */
const NOT_SUPPORTED_COMPONENT_TYPES = [
  ComponentType.EastingNorthingField,
  ComponentType.LatLongField,
  ComponentType.MonthYearField
]

/**
 * Component types with no customValidationMessage field on their options
 * type. TypeScript itself proves the option cannot be set, so there is
 * nothing to test at runtime. Listed here only so the coverage guard test
 * below accounts for every ComponentType.
 */
const NO_SINGULAR_MESSAGE_OPTION = [
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

describe('Component-level validation message override (customValidationMessage)', () => {
  // Fails when a new ComponentType is not in one of the three lists above.
  it('accounts for every ComponentType', () => {
    const accountedFor = [
      ...SUPPORTS_SINGULAR_MESSAGE,
      ...NOT_SUPPORTED_COMPONENT_TYPES,
      ...NO_SINGULAR_MESSAGE_OPTION
    ]

    expect(new Set(accountedFor).size).toBe(accountedFor.length)
    expect([...accountedFor].sort()).toEqual(
      [...Object.values(ComponentType)].sort()
    )
  })

  let model: FormModel
  let translator: ReturnType<FormModel['createTranslator']>

  beforeEach(() => {
    model = new FormModel(definition, { basePath: 'test' })
    translator = model.createTranslator()
  })

  describe('Supported', () => {
    describe('TextField', () => {
      const def = {
        title: 'Example text field',
        name: 'myComponent',
        type: ComponentType.TextField,
        options: { customValidationMessage: CUSTOM },
        schema: {}
      } satisfies TextFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('EmailAddressField', () => {
      const def = {
        title: 'Example email address field',
        name: 'myComponent',
        type: ComponentType.EmailAddressField,
        options: { customValidationMessage: CUSTOM }
      } satisfies EmailAddressFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('MultilineTextField', () => {
      const def = {
        title: 'Example multiline text field',
        name: 'myComponent',
        type: ComponentType.MultilineTextField,
        options: { customValidationMessage: CUSTOM },
        schema: {}
      } satisfies MultilineTextFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('TelephoneNumberField', () => {
      const def = {
        title: 'Example telephone number field',
        name: 'myComponent',
        type: ComponentType.TelephoneNumberField,
        options: { customValidationMessage: CUSTOM }
      } satisfies TelephoneNumberFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('NumberField', () => {
      const def = {
        title: 'Example number field',
        name: 'myComponent',
        type: ComponentType.NumberField,
        options: { customValidationMessage: CUSTOM },
        schema: {}
      } satisfies NumberFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('OsGridRefField', () => {
      const def = {
        title: 'Example OS grid reference',
        name: 'myComponent',
        type: ComponentType.OsGridRefField,
        options: { customValidationMessage: CUSTOM }
      } satisfies OsGridRefFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('NationalGridFieldNumberField', () => {
      const def = {
        title: 'Example national grid field number',
        name: 'myComponent',
        type: ComponentType.NationalGridFieldNumberField,
        options: { customValidationMessage: CUSTOM }
      } satisfies NationalGridFieldNumberFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('YesNoField', () => {
      const def = {
        title: 'Example yes/no field',
        name: 'myComponent',
        type: ComponentType.YesNoField,
        options: { customValidationMessage: CUSTOM }
      } satisfies YesNoFieldComponent

      it('honours the override', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection([def], { model })
        const result = collection.validate(getFormData(), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })
  })

  /**
   * These components declare customValidationMessage on their options type
   * but ignore it. Setting the option has no effect, so the same input must
   * give the same errors with and without it.
   */
  describe('Not supported', () => {
    it('EastingNorthingField', () => {
      const base = {
        title: 'Example easting northing',
        name: 'myComponent',
        type: ComponentType.EastingNorthingField,
        options: {},
        schema: {}
      } satisfies EastingNorthingFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessage: CUSTOM }
      } satisfies EastingNorthingFieldComponent

      const input = getCompositeFormData({ easting: '', northing: '' })
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('LatLongField', () => {
      const base = {
        title: 'Example lat long',
        name: 'myComponent',
        type: ComponentType.LatLongField,
        options: {},
        schema: {}
      } satisfies LatLongFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessage: CUSTOM }
      } satisfies LatLongFieldComponent

      const input = getCompositeFormData({ latitude: '', longitude: '' })
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('MonthYearField', () => {
      const base = {
        title: 'Example month/year field',
        name: 'myComponent',
        type: ComponentType.MonthYearField,
        options: {}
      } satisfies MonthYearFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessage: CUSTOM }
      } satisfies MonthYearFieldComponent

      const input = getCompositeFormData({ month: '', year: '' })
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })
  })
})
