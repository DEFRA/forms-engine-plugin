import {
  ComponentType,
  isFormType,
  type FormComponentsDef
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  buildComponent,
  buildModel,
  getInput
} from '~/test/helpers/validation-helpers.js'

/**
 * Checks `options.customValidationMessage` for every form component type,
 * with and without a translator. A real request always passes a translator.
 */

const CUSTOM = 'This is a custom validation message'
const OVERRIDE = { customValidationMessage: CUSTOM }

/**
 * Component types that use options.customValidationMessage
 */
const SUPPORTED_COMPONENT_TYPES: FormComponentsDef['type'][] = [
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
 * Component types that ignore options.customValidationMessage
 */
const NOT_SUPPORTED_COMPONENT_TYPES: FormComponentsDef['type'][] = [
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
  ComponentType.PaymentField,
  ComponentType.RadiosField,
  ComponentType.SelectField,
  ComponentType.AutocompleteField,
  ComponentType.TrackingField
]

describe('Component-level validation message override (customValidationMessage)', () => {
  let model: FormModel
  let translator: ReturnType<FormModel['createTranslator']>

  beforeEach(() => {
    model = buildModel()
    translator = model.createTranslator()
  })

  // Fails when a new form ComponentType is not in one of the two lists above.
  it('accounts for every form ComponentType', () => {
    const accountedFor = [
      ...SUPPORTED_COMPONENT_TYPES,
      ...NOT_SUPPORTED_COMPONENT_TYPES
    ]

    expect(new Set(accountedFor).size).toBe(accountedFor.length)
    expect([...accountedFor].sort()).toEqual(
      Object.values(ComponentType).filter(isFormType).sort()
    )
  })

  describe('Supported', () => {
    describe.each(SUPPORTED_COMPONENT_TYPES)('%s', (type) => {
      it('honours the override', () => {
        const collection = new ComponentCollection(
          [buildComponent(type, OVERRIDE)],
          { model }
        )
        const result = collection.validate(getInput(type))

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })

      it('honours the override at request time (with a translator)', () => {
        const collection = new ComponentCollection(
          [buildComponent(type, OVERRIDE)],
          { model }
        )
        const result = collection.validate(getInput(type), translator)

        expect(result.errors).toEqual([
          expect.objectContaining({ text: CUSTOM })
        ])
      })
    })
  })

  /**
   * Setting the option has no effect, so the same input must give the same
   * errors with and without it.
   */
  describe('Not supported', () => {
    it.each(NOT_SUPPORTED_COMPONENT_TYPES)('%s', (type) => {
      const input = getInput(type)
      const baseline = new ComponentCollection([buildComponent(type)], {
        model
      }).validate(input)
      const overridden = new ComponentCollection(
        [buildComponent(type, OVERRIDE)],
        { model }
      ).validate(input)

      expect(baseline.errors?.length).toBeGreaterThan(0)
      expect(overridden.errors).toEqual(baseline.errors)
    })
  })
})
