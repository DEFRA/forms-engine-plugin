import { ComponentType } from '@defra/forms-model'

import { FileUploadField } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { InvalidComponentStateError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import definition from '~/test/form/definitions/file-upload-basic.js'

describe('InvalidComponentStateError', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('getStateKeys', () => {
    it('should return component name and upload for FileUploadField', () => {
      const page = model.pages.find((p) => p.path === '/file-upload-component')
      const component = new FileUploadField(
        {
          name: 'fileUpload',
          title: 'Upload something',
          type: ComponentType.FileUploadField,
          options: {},
          schema: {}
        },
        { model, page }
      )

      const error = new InvalidComponentStateError(
        component,
        'Test error message'
      )
      const stateKeys = error.getStateKeys()

      expect(stateKeys).toEqual(['fileUpload', 'upload'])
    })

    it('should return only component name for non-FileUploadField components', () => {
      const page = model.pages.find((p) => p.path === '/file-upload-component')
      const component = new TextField(
        {
          name: 'textField',
          title: 'Text field',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        },
        { model, page: page }
      )

      const error = new InvalidComponentStateError(
        component,
        'Test error message'
      )
      const stateKeys = error.getStateKeys()

      expect(stateKeys).toEqual(['textField'])
    })
  })
})
