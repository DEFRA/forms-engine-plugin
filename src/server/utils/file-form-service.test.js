import { FormStatus } from '~/src/server/routes/types.js'
import { FileFormService } from '~/src/server/utils/file-form-service.js'

// Create the metadata which is shared for all forms
const now = new Date()
const user = { id: 'user', displayName: 'Username' }
const author = {
  createdAt: now,
  createdBy: user,
  updatedAt: now,
  updatedBy: user
}

const metadata = {
  id: '95e92559-968d-44ae-8666-2b1ad3dffd31',
  slug: 'example-form',
  title: 'Example form',
  organisation: 'Defra',
  teamName: 'Team name',
  teamEmail: 'team@defra.gov.uk',
  submissionGuidance: "Thanks for your submission, we'll be in touch",
  notificationEmail: 'email@domain.com',
  ...author,
  live: author
}

describe('File Form Service', () => {
  it('should load JSON files from disk', async () => {
    const loader = new FileFormService()

    const definition = await loader.addForm(
      'src/server/forms/test.json',
      metadata
    )

    const formsService = loader.toFormsService()
    expect(await formsService.getFormMetadata(metadata.slug)).toBe(metadata)
    expect(
      await formsService.getFormDefinition(metadata.id, FormStatus.Draft)
    ).toBe(definition)

    expect(() => loader.getFormMetadata('invalid-slug')).toThrow(
      "Form metadata 'invalid-slug' not found"
    )
    expect(() => loader.getFormDefinition('invalid-id')).toThrow(
      "Form definition 'invalid-id' not found"
    )
  })

  it('should load YAML files from disk', async () => {
    const loader = new FileFormService()

    const definition = await loader.addForm(
      'src/server/forms/test.yaml',
      metadata
    )

    const formsService = loader.toFormsService()
    expect(await formsService.getFormMetadata(metadata.slug)).toBe(metadata)
    expect(
      await formsService.getFormDefinition(metadata.id, FormStatus.Draft)
    ).toBe(definition)

    expect(() => loader.getFormMetadata('invalid-slug')).toThrow(
      "Form metadata 'invalid-slug' not found"
    )
    expect(() => loader.getFormDefinition('invalid-id')).toThrow(
      "Form definition 'invalid-id' not found"
    )
  })

  it("should throw if the file isn't JSON or YAML", async () => {
    const loader = new FileFormService()

    await expect(
      loader.addForm('src/server/forms/test.txt', metadata)
    ).rejects.toThrow("Invalid file extension '.txt'")
  })
})
