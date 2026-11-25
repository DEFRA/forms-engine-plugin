import { randomUUID } from 'node:crypto'

import { ComponentType } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { validSingleState } from '~/src/server/plugins/engine/components/helpers/__stubs__/geospatial.js'
import {
  getAnswer,
  getAnswerMarkdown
} from '~/src/server/plugins/engine/components/helpers/components.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { createPage } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { listString } from '~/test/fixtures/list.js'
import fileUploadDefinition from '~/test/form/definitions/file-upload-basic.js'

// A v4 caller passes no translator, so each component method uses English.
// Each component has a Welsh title, so that a Welsh result is different.
const cases =
  /** @type {{ def: ComponentDef, state: FormState, payload?: FormPayload, answer: string, error?: string }[]} */ (
    [
      {
        def: { title: 'Date', type: ComponentType.DatePartsField },
        state: { c__day: 31, c__month: 12, c__year: 2021 },
        answer: '31 December 2021',
        error: 'Date must include a day'
      },
      {
        def: { title: 'Month', type: ComponentType.MonthYearField },
        state: { c__month: 12, c__year: 2021 },
        answer: 'December 2021',
        error: 'Month must include a month'
      },
      {
        def: {
          title: 'Checkboxes',
          type: ComponentType.CheckboxesField,
          list: 'listString'
        },
        state: { c: ['1', '2'] },
        answer: '1 hour, 2 hours',
        error: 'Select checkboxes'
      },
      {
        def: {
          title: 'Radios',
          type: ComponentType.RadiosField,
          list: 'listString'
        },
        state: { c: '1' },
        answer: '1 hour',
        error: 'Select radios'
      },
      {
        def: { title: 'Yes or no', type: ComponentType.YesNoField },
        state: { c: true },
        answer: 'Yes',
        error: 'Yes or no - select yes or no'
      },
      {
        def: { title: 'Grid', type: ComponentType.EastingNorthingField },
        state: { c__easting: 12345, c__northing: 123456 },
        answer: 'Easting: 12345\nNorthing: 123456',
        error: 'Enter easting'
      },
      {
        def: { title: 'Lat long', type: ComponentType.LatLongField },
        state: { c__latitude: 51.5, c__longitude: -0.1 },
        answer: 'Latitude: 51.5\nLongitude: -0.1',
        error: 'Enter latitude'
      },
      {
        def: { title: 'Location', type: ComponentType.GeospatialField },
        state: { c: validSingleState },
        answer: 'Added 1 location',
        error: 'Select location'
      },
      {
        def: { title: 'Address', type: ComponentType.UkAddressField },
        state: {
          c__addressLine1: '1 High Street',
          c__town: 'Bristol',
          c__postcode: 'BS1 1AA'
        },
        payload: {
          c__uprn: '',
          c__addressLine1: '',
          c__addressLine2: '',
          c__town: '',
          c__county: '',
          c__postcode: ''
        },
        answer: '1 High Street, Bristol, BS1 1AA',
        error: 'Enter address line 1'
      },
      {
        def: {
          title: 'Declaration',
          type: ComponentType.DeclarationField,
          content: 'I confirm'
        },
        state: { c: true },
        answer: 'I understand and agree'
      },
      {
        def: { title: 'Upload', type: ComponentType.FileUploadField },
        state: { c: null },
        answer: '',
        error: 'Select upload'
      }
    ].map((item) => ({
      ...item,
      def: /** @type {ComponentDef} */ ({
        ...item.def,
        id: randomUUID(),
        name: 'c',
        options: {},
        schema: {}
      })
    }))
  )

const model = new FormModel(
  /** @type {FormDefinition} */ ({
    ...fileUploadDefinition,
    lists: [listString],
    metadata: {
      translations: {
        cy: Object.fromEntries(
          cases.map(({ def }) => [
            `components.${def.id}.title`,
            `Welsh ${def.title}`
          ])
        )
      }
    }
  }),
  { basePath: 'test' }
)
const page = createPage(model, fileUploadDefinition.pages[0])

describe.each(cases)(
  '$def.type with no translator',
  ({ def, state, payload = {}, answer, error }) => {
    const collection = new ComponentCollection([def], { page, model })
    const [field] = collection.fields
    /** @type {FormComponent} */
    const component = field

    it('uses English', () => {
      const value = component.getFormValueFromState(state)
      const { errors = [] } = collection.validate(payload)
      const { fieldset, label } =
        /** @type {{ fieldset?: { legend?: { text?: string } }, label?: { text?: string } }} */ (
          field.getViewModel({
            payload: collection.getFormDataFromState(state)
          })
        )

      expect(field.getDisplayStringFromState(state)).toBe(answer)
      expect(component.getDisplayStringFromFormValue(value)).toBe(answer)
      expect(field.getErrors(errors)?.[0]?.text).toBe(error)
      expect(field.getViewErrors(errors)?.[0]?.text).toBe(error)
      expect(fieldset?.legend?.text ?? label?.text).toBe(def.title)
    })
  }
)

it('getAnswer and getAnswerMarkdown use English', () => {
  const [field] = new ComponentCollection([cases[4].def], { page, model })
    .fields

  expect(getAnswer(field, cases[4].state)).toBe('Yes')
  expect(getAnswerMarkdown(field, cases[4].state)).toBe('Yes\n')
})

/**
 * @import { ComponentDef, FormDefinition } from '@defra/forms-model'
 * @import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
 * @import { FormPayload, FormState } from '~/src/server/plugins/engine/types.js'
 */
