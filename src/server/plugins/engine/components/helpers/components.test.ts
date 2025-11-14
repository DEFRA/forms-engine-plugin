import {
  ComponentType,
  type DeclarationFieldComponent,
  type EastingNorthingFieldComponent,
  type LatLongFieldComponent,
  type NationalGridFieldNumberFieldComponent,
  type OsGridRefFieldComponent
} from '@defra/forms-model'

import {
  getAnswer,
  getAnswerMarkdown
} from '~/src/server/plugins/engine/components/helpers/components.js'
import {
  DeclarationField,
  EastingNorthingField,
  LatLongField,
  NationalGridFieldNumberField,
  OsGridRefField
} from '~/src/server/plugins/engine/components/index.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'

describe('Location field formatting', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('EastingNorthingField', () => {
    let field: EastingNorthingField

    beforeEach(() => {
      const def: EastingNorthingFieldComponent = {
        type: ComponentType.EastingNorthingField,
        name: 'locationEN',
        title: 'Location',
        options: {}
      }
      field = new EastingNorthingField(def, { model })
    })

    it('formats for email output with labels on separate lines', () => {
      const state = {
        locationEN__easting: 123456,
        locationEN__northing: 654321
      }

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('Northing: 654321\nEasting: 123456\n')
    })

    it('formats for data output', () => {
      const state = {
        locationEN__easting: 123456,
        locationEN__northing: 654321
      }

      const answer = getAnswer(field, state, { format: 'data' })
      expect(answer).toBe('Northing: 654321\nEasting: 123456')
    })

    it('formats for summary display', () => {
      const state = {
        locationEN__easting: 123456,
        locationEN__northing: 654321
      }

      const answer = getAnswer(field, state, { format: 'summary' })
      // Should render as HTML from markdown
      expect(answer).toContain('Northing: 654321')
      expect(answer).toContain('Easting: 123456')
    })

    it('returns empty string when no values', () => {
      const state = {}

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('')
    })
  })

  describe('LatLongField', () => {
    let field: LatLongField

    beforeEach(() => {
      const def: LatLongFieldComponent = {
        type: ComponentType.LatLongField,
        name: 'locationLL',
        title: 'Coordinates',
        options: {}
      }
      field = new LatLongField(def, { model })
    })

    it('formats for email output with labels on separate lines', () => {
      const state = {
        locationLL__latitude: 51.51945,
        locationLL__longitude: -0.127758
      }

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('Lat: 51.51945\nLong: -0.127758\n')
    })

    it('formats for data output', () => {
      const state = {
        locationLL__latitude: 51.51945,
        locationLL__longitude: -0.127758
      }

      const answer = getAnswer(field, state, { format: 'data' })
      expect(answer).toBe('Lat: 51.51945\nLong: -0.127758')
    })

    it('formats for summary display', () => {
      const state = {
        locationLL__latitude: 51.51945,
        locationLL__longitude: -0.127758
      }

      const answer = getAnswer(field, state, { format: 'summary' })
      // Should render as HTML from markdown
      expect(answer).toContain('Lat: 51.51945')
      expect(answer).toContain('Long: -0.127758')
    })

    it('returns empty string when no values', () => {
      const state = {}

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('')
    })
  })

  describe('OsGridRefField', () => {
    let field: OsGridRefField

    beforeEach(() => {
      const def: OsGridRefFieldComponent = {
        type: ComponentType.OsGridRefField,
        name: 'gridRef',
        title: 'OS Grid Reference',
        options: {}
      }
      field = new OsGridRefField(def, { model })
    })

    it('formats for email output as single value', () => {
      const state = {
        gridRef: 'TQ123456'
      }

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('TQ123456\n')
    })

    it('formats for data output', () => {
      const state = {
        gridRef: 'TQ123456'
      }

      const answer = getAnswer(field, state, { format: 'data' })
      expect(answer).toBe('TQ123456')
    })

    it('formats for summary display', () => {
      const state = {
        gridRef: 'TQ123456'
      }

      const answer = getAnswer(field, state, { format: 'summary' })
      expect(answer).toBe('TQ123456')
    })
  })

  describe('NationalGridFieldNumberField', () => {
    let field: NationalGridFieldNumberField

    beforeEach(() => {
      const def: NationalGridFieldNumberFieldComponent = {
        type: ComponentType.NationalGridFieldNumberField,
        name: 'ngField',
        title: 'National Grid Field Number',
        options: {}
      }
      field = new NationalGridFieldNumberField(def, { model })
    })

    it('formats for email output as single value', () => {
      const state = {
        ngField: 'NG12345678'
      }

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('NG12345678\n')
    })

    it('formats for data output', () => {
      const state = {
        ngField: 'NG12345678'
      }

      const answer = getAnswer(field, state, { format: 'data' })
      expect(answer).toBe('NG12345678')
    })

    it('formats for summary display', () => {
      const state = {
        ngField: 'NG12345678'
      }

      const answer = getAnswer(field, state, { format: 'summary' })
      expect(answer).toBe('NG12345678')
    })
  })

  describe('DeclarationField', () => {
    let field: DeclarationField

    beforeEach(() => {
      const def: DeclarationFieldComponent = {
        type: ComponentType.DeclarationField,
        name: 'declField',
        title: 'Declaration title',
        content: '# markup heading',
        options: {}
      }
      field = new DeclarationField(def, { model })
    })

    it('formats correctly when agreed', () => {
      const state = {
        declField: true
      }

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('I understand and agree\n')
    })

    it('formats correctly when not agreed', () => {
      const state = {
        declField: false
      }

      const answer = getAnswer(field, state, { format: 'email' })
      expect(answer).toBe('Not provided\n')
    })

    it('formats for data output when agreed', () => {
      const state = {
        declField: true
      }

      const answer = getAnswer(field, state, { format: 'data' })
      expect(answer).toBe('true')
    })

    it('formats for data output when not agreed', () => {
      const state = {
        declField: false
      }

      const answer = getAnswer(field, state, { format: 'data' })
      expect(answer).toBe('false')
    })

    it('formats for data output when no value', () => {
      const state = {}

      const answer = getAnswer(field, state, { format: 'data' })
      expect(answer).toBe('false')
    })

    it('formats for summary display when agreed', () => {
      const state = {
        declField: true
      }

      const answer = getAnswer(field, state, { format: 'summary' })
      expect(answer).toBe('I understand and agree')
    })

    it('formats for summary display when not agreed', () => {
      const state = {
        declField: false
      }

      const answer = getAnswer(field, state, { format: 'summary' })
      expect(answer).toBe('Not provided')
    })

    it('formats for summary display when no value', () => {
      const state = {}

      const answer = getAnswer(field, state, { format: 'summary' })
      expect(answer).toBe('Not provided')
    })
  })

  describe('getAnswerMarkdown', () => {
    it('formats EastingNorthingField correctly', () => {
      const def: EastingNorthingFieldComponent = {
        type: ComponentType.EastingNorthingField,
        name: 'locationEN',
        title: 'Location',
        options: {}
      }
      const field = new EastingNorthingField(def, { model })
      const state = {
        locationEN__easting: 123456,
        locationEN__northing: 654321
      }

      const answer = getAnswerMarkdown(field, state, { format: 'email' })
      expect(answer).toBe('Northing: 654321\nEasting: 123456\n')
    })

    it('formats LatLongField correctly', () => {
      const def: LatLongFieldComponent = {
        type: ComponentType.LatLongField,
        name: 'locationLL',
        title: 'Coordinates',
        options: {}
      }
      const field = new LatLongField(def, { model })
      const state = {
        locationLL__latitude: 51.51945,
        locationLL__longitude: -0.127758
      }

      const answer = getAnswerMarkdown(field, state, { format: 'email' })
      expect(answer).toBe('Lat: 51.51945\nLong: -0.127758\n')
    })

    it('formats simple location fields correctly', () => {
      const def: OsGridRefFieldComponent = {
        type: ComponentType.OsGridRefField,
        name: 'gridRef',
        title: 'OS Grid Reference',
        options: {}
      }
      const field = new OsGridRefField(def, { model })
      const state = {
        gridRef: 'TQ123456'
      }

      const answer = getAnswerMarkdown(field, state, { format: 'email' })
      expect(answer).toBe('TQ123456\n')
    })
  })
})
