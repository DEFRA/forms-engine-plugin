import { formStatusSchema } from '../components/FileUploadField.js'
import { FormStatus } from '../types/index.js'

import { config } from '~/src/config/index.js'
import { generateAutoComponentsForm } from '~/src/server/plugins/engine/services/autoComponentsFormUtil.js'
import { FileFormService } from '~/src/server/utils/file-form-service.js'

// Create shared form metadata
const now = new Date()
const user = { id: 'user', displayName: 'Username' }
const author = {
  createdAt: now,
  createdBy: user,
  updatedAt: now,
  updatedBy: user
}

export const AUTO_COMPONENTS_FORM_ID = '1s23e4567-e89b-12d3-a456-426614174000'
export const AUTO_COMPONENTS_SLUG = 'auto-components'
const metadata = {
  organisation: 'Defra',
  teamName: 'Team name',
  teamEmail: 'team@defra.gov.uk',
  submissionGuidance: "Thanks for your submission, we'll be in touch",
  notificationEmail: config.get('submissionEmailAddress'),
  ...author,
  live: author
}

class DevToolFormService extends FileFormService {
  toFormsService() {
    const defaultService = super.toFormsService()
    return {
      /**
       * Get the form metadata by slug
       * @param {string} slug
       * @returns {Promise<import('@defra/forms-model').FormMetadata>}
       */
      getFormMetadata: async (slug) => {
        if (slug === AUTO_COMPONENTS_SLUG) {
          return {
            id: AUTO_COMPONENTS_FORM_ID,
            title: 'All components (automatically generated)',
            slug: AUTO_COMPONENTS_SLUG,
            ...metadata
          }
        }
        return defaultService.getFormMetadata(slug)
      },

      /**
       * Get the form definition by id
       * @param {string} id
       */
      getFormDefinition: async (id) => {
        if (id === AUTO_COMPONENTS_FORM_ID) {
          return generateAutoComponentsForm()
        }
        return defaultService.getFormDefinition(id, FormStatus.Live)
      }
    }
  }
}

/**
 * Return an function rather than the service directly. This is to prevent consumer applications
 * blowing up as they won't have these files on disk. We can defer the execution until when it's
 * needed, i.e. the createServer function of the devtool.
 */
export const formsService = async () => {
  // Instantiate the file loader form service
  const loader = new DevToolFormService()

  // Add a Yaml form
  await loader.addForm('src/server/forms/register-as-a-unicorn-breeder.yaml', {
    ...metadata,
    id: '641aeafd-13dd-40fa-9186-001703800efb',
    title: 'Register as a unicorn breeder',
    slug: 'register-as-a-unicorn-breeder'
  })

  await loader.addForm('src/server/forms/page-events.yaml', {
    ...metadata,
    id: '511db05e-ebbd-42e8-8270-5fe93f5c9762',
    title: 'Page events demo',
    slug: 'page-events-demo'
  })

  await loader.addForm('src/server/forms/components.json', {
    ...metadata,
    id: '6a872d3b-13f9e-804ce3e-4830-5c45fb32',
    title: 'Components',
    slug: 'components'
  })

  return loader.toFormsService()
}
