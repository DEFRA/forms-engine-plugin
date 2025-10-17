import { config } from '~/src/config/index.js'
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
const metadata = {
  organisation: 'Defra',
  teamName: 'Team name',
  teamEmail: 'team@defra.gov.uk',
  submissionGuidance: "Thanks for your submission, we'll be in touch",
  notificationEmail: config.get('submissionEmailAddress'),
  ...author,
  live: author
}

/**
 * Return an function rather than the service directly. This is to prevent consumer applications
 * blowing up as they won't have these files on disk. We can defer the execution until when it's
 * needed, i.e. the createServer function of the devtool.
 */
export const formsService = async () => {
  // Instantiate the file loader form service
  const loader = new FileFormService()

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

  // external-components

  await loader.addForm('src/server/forms/external-components.json', {
    ...metadata,
    id: 'z6a872d3b-13f9e-804ce3e-4830-5c45fb32',
    title: 'external-components',
    slug: 'external-components'
  })

  return loader.toFormsService()
}
