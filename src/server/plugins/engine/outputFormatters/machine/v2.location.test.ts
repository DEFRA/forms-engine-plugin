import {
  ComponentType,
  type EastingNorthingFieldComponent,
  type FormDefinition,
  type LatLongFieldComponent,
  type NationalGridFieldNumberFieldComponent,
  type OsGridRefFieldComponent,
  type PageQuestion
} from '@defra/forms-model'

import {
  EastingNorthingField,
  LatLongField,
  NationalGridFieldNumberField,
  OsGridRefField
} from '~/src/server/plugins/engine/components/index.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItemField } from '~/src/server/plugins/engine/models/types.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'
import { buildFormContextRequest } from '~/src/server/plugins/engine/pageControllers/__stubs__/request.js'
import { FormStatus } from '~/src/server/routes/types.js'

describe('Machine V2 formatter - Location fields', () => {
  const definition: FormDefinition = {
    name: 'Location Test Form',
    startPage: '/location',
    pages: [
      {
        path: '/location',
        title: 'Location Page',
        next: [],
        components: [
          {
            type: ComponentType.EastingNorthingField,
            name: 'locationEN',
            title: 'Easting and Northing',
            options: {}
          },
          {
            type: ComponentType.LatLongField,
            name: 'locationLL',
            title: 'Latitude and Longitude',
            options: {}
          },
          {
            type: ComponentType.OsGridRefField,
            name: 'gridRef',
            title: 'OS Grid Reference',
            options: {}
          },
          {
            type: ComponentType.NationalGridFieldNumberField,
            name: 'ngField',
            title: 'National Grid Field Number',
            options: {}
          }
        ]
      } satisfies PageQuestion
    ],
    lists: [],
    sections: [],
    conditions: []
  }

  const model = new FormModel(definition, { basePath: 'test' })
  const locationPage = definition.pages[0] as PageQuestion

  const submitResponse = {
    message: 'Submit completed',
    result: {
      files: {
        main: '00000000-0000-0000-0000-000000000000',
        repeaters: {}
      }
    }
  }

  const pageUrl = new URL('http://example.com/test/location')

  const request = buildFormContextRequest({
    method: 'get',
    url: pageUrl,
    path: pageUrl.pathname,
    params: {
      path: 'location',
      slug: 'test'
    },
    query: {},
    app: { model }
  })

  const formStatus = {
    isPreview: false,
    state: FormStatus.Live
  }

  it('includes LatLongField values with full property names (latitude/longitude) in the payload', () => {
    const state = {
      $$__referenceNumber: 'ABC-123',
      locationLL__latitude: 51.51945,
      locationLL__longitude: -0.127758
    }

    const context = model.getFormContext(request, state)

    const latLongField = new LatLongField(
      locationPage.components[1] as LatLongFieldComponent,
      { model }
    )

    const items: DetailItemField[] = [
      {
        name: 'locationLL',
        label: 'Latitude and Longitude',
        href: '/location',
        title: 'Latitude and Longitude',
        field: latLongField,
        state,
        value: '51.519450, -0.127758'
      } as unknown as DetailItemField
    ]

    const result = format(context, items, model, submitResponse, formStatus)
    const payload = JSON.parse(result)

    // Verify the payload uses full property names, not abbreviated
    expect(payload.data.main.locationLL).toEqual({
      latitude: 51.51945,
      longitude: -0.127758
    })

    // Ensure abbreviated forms are NOT present
    expect(payload.data.main.locationLL).not.toHaveProperty('lat')
    expect(payload.data.main.locationLL).not.toHaveProperty('long')
  })

  it('includes EastingNorthingField values with full property names (easting/northing) in the payload', () => {
    const state = {
      $$__referenceNumber: 'ABC-123',
      locationEN__easting: 123456,
      locationEN__northing: 654321
    }

    const context = model.getFormContext(request, state)

    const eastingNorthingField = new EastingNorthingField(
      locationPage.components[0] as EastingNorthingFieldComponent,
      { model }
    )

    const items: DetailItemField[] = [
      {
        name: 'locationEN',
        label: 'Easting and Northing',
        href: '/location',
        title: 'Easting and Northing',
        field: eastingNorthingField,
        state,
        value: '654321, 123456'
      } as unknown as DetailItemField
    ]

    const result = format(context, items, model, submitResponse, formStatus)
    const payload = JSON.parse(result)

    // Verify the payload uses full property names
    expect(payload.data.main.locationEN).toEqual({
      easting: 123456,
      northing: 654321
    })
  })

  it('includes simple location field values in the payload', () => {
    const state = {
      $$__referenceNumber: 'ABC-123',
      gridRef: 'TQ123456',
      ngField: 'NG12345678'
    }

    const context = model.getFormContext(request, state)

    const osGridRefField = new OsGridRefField(
      locationPage.components[2] as OsGridRefFieldComponent,
      { model }
    )

    const nationalGridField = new NationalGridFieldNumberField(
      locationPage.components[3] as NationalGridFieldNumberFieldComponent,
      { model }
    )

    const items: DetailItemField[] = [
      {
        name: 'gridRef',
        label: 'OS Grid Reference',
        href: '/location',
        title: 'OS Grid Reference',
        field: osGridRefField,
        state,
        value: 'TQ123456'
      } as unknown as DetailItemField,
      {
        name: 'ngField',
        label: 'National Grid Field Number',
        href: '/location',
        title: 'National Grid Field Number',
        field: nationalGridField,
        state,
        value: 'NG12345678'
      } as unknown as DetailItemField
    ]

    const result = format(context, items, model, submitResponse, formStatus)
    const payload = JSON.parse(result)

    expect(payload.data.main.gridRef).toBe('TQ123456')
    expect(payload.data.main.ngField).toBe('NG12345678')
  })

  it('includes all location fields in a mixed form with correct property names', () => {
    const state = {
      $$__referenceNumber: 'ABC-123',
      locationEN__easting: 123456,
      locationEN__northing: 654321,
      locationLL__latitude: 51.51945,
      locationLL__longitude: -0.127758,
      gridRef: 'TQ123456',
      ngField: 'NG12345678'
    }

    const context = model.getFormContext(request, state)

    const eastingNorthingField = new EastingNorthingField(
      locationPage.components[0] as EastingNorthingFieldComponent,
      { model }
    )
    const latLongField = new LatLongField(
      locationPage.components[1] as LatLongFieldComponent,
      { model }
    )
    const osGridRefField = new OsGridRefField(
      locationPage.components[2] as OsGridRefFieldComponent,
      { model }
    )
    const nationalGridField = new NationalGridFieldNumberField(
      locationPage.components[3] as NationalGridFieldNumberFieldComponent,
      { model }
    )

    const items: DetailItemField[] = [
      {
        name: 'locationEN',
        label: 'Easting and Northing',
        href: '/location',
        title: 'Easting and Northing',
        field: eastingNorthingField,
        state,
        value: '654321, 123456'
      } as unknown as DetailItemField,
      {
        name: 'locationLL',
        label: 'Latitude and Longitude',
        href: '/location',
        title: 'Latitude and Longitude',
        field: latLongField,
        state,
        value: '51.519450, -0.127758'
      } as unknown as DetailItemField,
      {
        name: 'gridRef',
        label: 'OS Grid Reference',
        href: '/location',
        title: 'OS Grid Reference',
        field: osGridRefField,
        state,
        value: 'TQ123456'
      } as unknown as DetailItemField,
      {
        name: 'ngField',
        label: 'National Grid Field Number',
        href: '/location',
        title: 'National Grid Field Number',
        field: nationalGridField,
        state,
        value: 'NG12345678'
      } as unknown as DetailItemField
    ]

    const result = format(context, items, model, submitResponse, formStatus)
    const payload = JSON.parse(result)

    // Check all location fields use full property names
    expect(payload.data.main).toEqual({
      locationEN: {
        easting: 123456,
        northing: 654321
      },
      locationLL: {
        latitude: 51.51945,
        longitude: -0.127758
      },
      gridRef: 'TQ123456',
      ngField: 'NG12345678'
    })

    // Explicitly verify no abbreviated forms exist
    expect(payload.data.main.locationLL).not.toHaveProperty('lat')
    expect(payload.data.main.locationLL).not.toHaveProperty('long')
  })

  it('handles undefined location field values correctly', () => {
    const state = {
      $$__referenceNumber: 'ABC-123'
    }

    const context = model.getFormContext(request, state)

    const latLongField = new LatLongField(
      locationPage.components[1] as LatLongFieldComponent,
      { model }
    )

    const items: DetailItemField[] = [
      {
        name: 'locationLL',
        label: 'Latitude and Longitude',
        href: '/location',
        title: 'Latitude and Longitude',
        field: latLongField,
        state,
        value: ''
      } as unknown as DetailItemField
    ]

    const result = format(context, items, model, submitResponse, formStatus)
    const payload = JSON.parse(result)

    // Undefined location fields should be undefined in v2 (not null like in v1)
    expect(payload.data.main.locationLL).toBeUndefined()
  })
})
