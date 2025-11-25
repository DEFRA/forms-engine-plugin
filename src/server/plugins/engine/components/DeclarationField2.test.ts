import { type DeclarationField } from '~/src/server/plugins/engine/components/DeclarationField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import declarationWithGuidance from '~/test/form/definitions/declaration-with-guidance.js'
import declarationWithoutGuidance from '~/test/form/definitions/declaration-without-guidance.js'

describe('Markdown header starting level', () => {
  test('should determine startHeadingLevel is 3 some guidance', () => {
    const modelDecl = new FormModel(declarationWithGuidance, {
      basePath: 'test'
    })
    const field = modelDecl.componentMap.get(
      'declarationField'
    ) as DeclarationField
    expect(field.headerStartLevel).toBe(3)
  })

  test('should determine startHeadingLevel is 2 when no guidance', () => {
    const modelDecl = new FormModel(declarationWithoutGuidance, {
      basePath: 'test'
    })
    const field = modelDecl.componentMap.get(
      'declarationField'
    ) as DeclarationField
    expect(field.headerStartLevel).toBe(2)
  })
})
