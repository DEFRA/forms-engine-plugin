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

// Instantiate the file loader form service
const loader = new FileFormService()

// Add a Json form
await loader.addForm('src/server/forms/register-as-a-unicorn-breeder.json', {
  ...metadata,
  id: '95e92559-968d-44ae-8666-2b1ad3dffd31',
  title: 'Register as a unicorn breeder',
  slug: 'register-as-a-unicorn-breeder'
})

// Add a Yaml form
await loader.addForm('src/server/forms/register-as-a-unicorn-breeder.yaml', {
  ...metadata,
  id: '641aeafd-13dd-40fa-9186-001703800efb',
  title: 'Register as a unicorn breeder (yaml)',
  slug: 'register-as-a-unicorn-breeder-yaml' // if we needed to validate any JSON logic, make it available for convenience
})

// Get the forms service
export const formsService = loader.toFormsService()
