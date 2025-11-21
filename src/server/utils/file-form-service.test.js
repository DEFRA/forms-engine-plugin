import { join } from 'node:path'

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
})
