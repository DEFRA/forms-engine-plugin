import { join } from 'node:path'

import { FormStatus } from '~/src/server/routes/types.js'
import { FileFormService } from '~/src/server/utils/file-form-service.js'

describe('File-form-service', () => {
  /** @type {FileFormService} */
  let service
  beforeEach(async () => {
    const now = new Date()
    const user = { id: 'user', displayName: 'Username' }
    const author = {
      createdAt: now,
      createdBy: user,
      updatedAt: now,
      updatedBy: user
    }
    service = new FileFormService()
    const metadata = {
      organisation: 'Defra',
      teamName: 'Team name',
      teamEmail: 'team@defra.gov.uk',
      submissionGuidance: "Thanks for your submission, we'll be in touch",
      notificationEmail: 'email@domain.com',
      ...author,
      live: author
    }
    await service.addForm(
      `${join(import.meta.dirname, '../../../test/form/definitions')}/components.json`,
      {
        ...metadata,
        id: '95e92559-968d-44ae-8666-2b1ad3dffd31',
        title: 'Form test',
        slug: 'form-test'
      }
    )
  })

  describe('metadata by slug', () => {
    it('should get form metadata by slug', () => {
      const meta = service.getFormMetadata('form-test')
      expect(meta.id).toBe('95e92559-968d-44ae-8666-2b1ad3dffd31')
      expect(meta.title).toBe('Form test')
    })

    it('should throw if not found', () => {
      expect(() => service.getFormMetadata('form-test-missing')).toThrow(
        "Form metadata 'form-test-missing' not found"
      )
    })
  })

  describe('metadata by id', () => {
    it('should get form metadata by id', () => {
      const meta = service.getFormMetadataById(
        '95e92559-968d-44ae-8666-2b1ad3dffd31'
      )
      expect(meta.id).toBe('95e92559-968d-44ae-8666-2b1ad3dffd31')
      expect(meta.title).toBe('Form test')
    })

    it('should throw if not found', () => {
      expect(() => service.getFormMetadataById('id-missing')).toThrow(
        "Form metadata id 'id-missing' not found"
      )
    })
  })

  describe('definition by id', () => {
    it('should get form definition by id', () => {
      const form = service.getFormDefinition(
        '95e92559-968d-44ae-8666-2b1ad3dffd31'
      )
      expect(form.name).toBe('All components')
      expect(form.startPage).toBe('/all-components')
    })

    it('should throw if not found', () => {
      expect(() => service.getFormDefinition('id-missing')).toThrow(
        "Form definition 'id-missing' not found"
      )
    })
  })

  describe('toFormsService', () => {
    it('should create interface', async () => {
      const interfaceImpl = service.toFormsService()
      const res1 = await interfaceImpl.getFormMetadata('form-test')
      expect(res1.id).toBe('95e92559-968d-44ae-8666-2b1ad3dffd31')
      expect(res1.title).toBe('Form test')

      const res2 = await interfaceImpl.getFormMetadataById(
        '95e92559-968d-44ae-8666-2b1ad3dffd31'
      )
      expect(res2.id).toBe('95e92559-968d-44ae-8666-2b1ad3dffd31')
      expect(res2.title).toBe('Form test')

      const res3 = await interfaceImpl.getFormDefinition(
        '95e92559-968d-44ae-8666-2b1ad3dffd31',
        FormStatus.Draft
      )
      expect(res3?.name).toBe('All components')
      expect(res3?.startPage).toBe('/all-components')

      const res4 = await interfaceImpl.getFormSecret(
        '95e92559-968d-44ae-8666-2b1ad3dffd31',
        'my-secret-name'
      )
      expect(res4).toBe('test-api-key')

      delete process.env.PAYMENT_PROVIDER_API_KEY_TEST
      const res5 = await interfaceImpl.getFormSecret(
        '95e92559-968d-44ae-8666-2b1ad3dffd31',
        'my-secret-name'
      )
      expect(res5).toBe('')
    })
  })

  describe('readForm', () => {
    it('should throw if invalid extension', async () => {
      await expect(
        service.readForm('/some-folder/some-file.bad')
      ).rejects.toThrow("Invalid file extension '.bad'")
    })
  })
})
