import {
  ComponentType,
  type AutocompleteFieldComponent,
  type CheckboxesFieldComponent,
  type DatePartsFieldComponent,
  type DeclarationFieldComponent,
  type EastingNorthingFieldComponent,
  type EmailAddressFieldComponent,
  type FileUploadFieldComponent,
  type GeospatialFieldComponent,
  type HiddenFieldComponent,
  type LatLongFieldComponent,
  type MonthYearFieldComponent,
  type MultilineTextFieldComponent,
  type NationalGridFieldNumberFieldComponent,
  type NumberFieldComponent,
  type OsGridRefFieldComponent,
  type PaymentFieldComponent,
  type RadiosFieldComponent,
  type SelectFieldComponent,
  type TelephoneNumberFieldComponent,
  type TextFieldComponent,
  type UkAddressFieldComponent,
  type YesNoFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  IGNORES_PLURAL_MESSAGES,
  NO_PLURAL_MESSAGES_OPTION,
  SUPPORTS_PLURAL_MESSAGES
} from '~/src/server/plugins/engine/components/customValidationMessageSupport.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormValue } from '~/src/server/plugins/engine/types.js'
import { listString } from '~/test/fixtures/list.js'
import definition from '~/test/form/definitions/blank.js'
import {
  getCompositeFormData,
  getFormData
} from '~/test/helpers/component-helpers.js'

/**
 * Each component has its own test file for schema, state and view model
 * checks. This file has one job: check `options.customValidationMessages`
 * (a map keyed by Joi error type) for every component type, in two ways:
 * - `validate(input)` - a plain unit test, no translator.
 * - `validate(input, translator)` - matches a real request. `FormModel.ts`
 *   always passes a translator when it validates form input.
 *
 * Which components use the option is recorded in
 * customValidationMessageSupport.js, shared with the doc generator so the
 * published Options tables stay in step with this test.
 *
 * Some of these components also support a singular `customValidationMessage`
 * string. Support for the two options is not identical, so the singular
 * option has its own test file: customValidationMessage.test.ts.
 *
 * Fixed regression: NumberField, OsGridRefField, NationalGridFieldNumberField
 * and AutocompleteField worked in v4.23.0 (the last v4 release, which had no
 * `getValidationMessagesOverride()` and no translator argument on
 * `validate()`). In v5, `getValidationMessagesOverride()` always replaced the
 * author's message with a translated default at request time, breaking the
 * option. `withCustomValidationOverrides()` (components/helpers/index.ts) now
 * keeps the author's message for any key they set.
 *
 * Not a regression: YesNoField never supported the option in v4.23.0.
 */

const CUSTOM = 'This is a custom validation message'

describe('Component-level validation message override (customValidationMessages)', () => {
  // Fails when a new ComponentType is not in one of the three lists above.
  it('accounts for every ComponentType', () => {
    const accountedFor = [
      ...SUPPORTS_PLURAL_MESSAGES,
      ...IGNORES_PLURAL_MESSAGES,
      ...NO_PLURAL_MESSAGES_OPTION
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
        options: { customValidationMessages: { 'any.required': CUSTOM } },
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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
        options: { customValidationMessages: { 'any.required': CUSTOM } },
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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
        options: { customValidationMessages: { 'any.required': CUSTOM } },
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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

    describe('RadiosField', () => {
      const def = {
        title: 'Example radios field',
        name: 'myComponent',
        type: ComponentType.RadiosField,
        list: 'listString',
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies RadiosFieldComponent

      function buildModel() {
        const updated = structuredClone(definition)
        updated.lists = [listString]
        return new FormModel(updated, { basePath: 'test' })
      }

      it('honours the override', () => {
        const collection = new ComponentCollection([def], {
          model: buildModel()
        })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const listModel = buildModel()
        const collection = new ComponentCollection([def], { model: listModel })
        const result = collection.validate(
          getFormData(),
          listModel.createTranslator()
        )

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('SelectField', () => {
      const def = {
        title: 'Example select field',
        name: 'myComponent',
        type: ComponentType.SelectField,
        list: 'listString',
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies SelectFieldComponent

      function buildModel() {
        const updated = structuredClone(definition)
        updated.lists = [listString]
        return new FormModel(updated, { basePath: 'test' })
      }

      it('honours the override', () => {
        const collection = new ComponentCollection([def], {
          model: buildModel()
        })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const listModel = buildModel()
        const collection = new ComponentCollection([def], { model: listModel })
        const result = collection.validate(
          getFormData(),
          listModel.createTranslator()
        )

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })

    describe('AutocompleteField', () => {
      const def = {
        title: 'Example autocomplete field',
        name: 'myComponent',
        type: ComponentType.AutocompleteField,
        list: 'listString',
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies AutocompleteFieldComponent

      function buildModel() {
        const updated = structuredClone(definition)
        updated.lists = [listString]
        return new FormModel(updated, { basePath: 'test' })
      }

      it('honours the override', () => {
        const collection = new ComponentCollection([def], {
          model: buildModel()
        })
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const listModel = buildModel()
        const collection = new ComponentCollection([def], { model: listModel })
        const result = collection.validate(
          getFormData(),
          listModel.createTranslator()
        )

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })
  })

  /**
   * These components ignore options.customValidationMessages. Setting the
   * option has no effect, so the same input must give the same errors with
   * and without it.
   */
  describe('Not supported', () => {
    it('CheckboxesField', () => {
      const updated = structuredClone(definition)
      updated.lists = [listString]
      const listModel = new FormModel(updated, { basePath: 'test' })

      const base = {
        title: 'Example checkboxes field',
        name: 'myComponent',
        type: ComponentType.CheckboxesField,
        list: 'listString',
        options: {}
      } satisfies CheckboxesFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies CheckboxesFieldComponent

      const baseline = new ComponentCollection([base], {
        model: listModel
      }).validate(getFormData())
      const overridden = new ComponentCollection([withOverride], {
        model: listModel
      }).validate(getFormData())

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('DatePartsField', () => {
      const base = {
        title: 'Example date parts field',
        name: 'myComponent',
        type: ComponentType.DatePartsField,
        options: {}
      } satisfies DatePartsFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies DatePartsFieldComponent

      const input = getCompositeFormData({ day: '', month: '', year: '' })
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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
        options: { customValidationMessages: { 'any.required': CUSTOM } }
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

    it('UkAddressField', () => {
      const base = {
        title: 'Example UK address',
        name: 'myComponent',
        type: ComponentType.UkAddressField,
        options: {}
      } satisfies UkAddressFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies UkAddressFieldComponent

      const input = getCompositeFormData({
        addressLine1: '',
        addressLine2: '',
        town: '',
        county: '',
        postcode: '',
        uprn: ''
      })
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('FileUploadField', () => {
      const base = {
        title: 'Example file upload field',
        name: 'myComponent',
        type: ComponentType.FileUploadField,
        options: {},
        schema: {}
      } satisfies FileUploadFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies FileUploadFieldComponent

      const input = getFormData()
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('DeclarationField', () => {
      const base = {
        title: 'Example declaration field',
        name: 'myComponent',
        content: 'Lorem ipsum dolar sit amet',
        type: ComponentType.DeclarationField,
        options: {}
      } satisfies DeclarationFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies DeclarationFieldComponent

      const input = getFormData(['unchecked'])
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('HiddenField', () => {
      const base = {
        title: 'Example hidden field',
        name: 'myComponent',
        type: ComponentType.HiddenField,
        options: {}
      } satisfies HiddenFieldComponent

      const withOverride = {
        ...base,
        options: { customValidationMessages: { 'any.required': CUSTOM } }
      } satisfies HiddenFieldComponent

      const input = getFormData()
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('GeospatialField', () => {
      const base = {
        title: 'Example geospatial field',
        name: 'myComponent',
        type: ComponentType.GeospatialField,
        options: { required: true }
      } satisfies GeospatialFieldComponent

      const withOverride = {
        ...base,
        options: {
          required: true,
          customValidationMessages: { 'any.required': CUSTOM }
        }
      } satisfies GeospatialFieldComponent

      const input = getFormData('')
      const baseline = new ComponentCollection([base], { model }).validate(
        input
      )
      const overridden = new ComponentCollection([withOverride], {
        model
      }).validate(input)

      expect(overridden.errors).toEqual(baseline.errors)
    })

    it('PaymentField', () => {
      const base = {
        title: 'Example payment field',
        name: 'myComponent',
        type: ComponentType.PaymentField,
        options: { amount: 100, description: 'Test payment description' }
      } satisfies PaymentFieldComponent

      const withOverride = {
        ...base,
        options: {
          ...base.options,
          customValidationMessages: { 'any.required': CUSTOM }
        }
      } satisfies PaymentFieldComponent

      const payment = {
        paymentId: '',
        reference: '',
        amount: 0,
        description: '',
        uuid: '',
        formId: '',
        isLivePayment: false
      }
      const input = getFormData(payment as unknown as FormValue)
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
