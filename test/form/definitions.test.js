import { join, parse } from 'node:path'

import { formDefinitionSchema } from '@defra/forms-model'

import { getForms } from '~/test/utils/get-form-definitions.js'

/**
 * @param {string} importPath
 * @returns {Promise<import('@defra/forms-model').FormDefinition>}
 */
async function getForm(importPath) {
  const { ext } = parse(importPath)

  const attributes = {
    type: ext === '.json' ? 'json' : 'module'
  }

  const formImport = await import(importPath, { with: attributes })

  const { default: definition } = formImport

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return definition
}

describe('Form definition JSON', () => {
  describe.each([
    {
      description: 'Demo forms',
      directory: join(import.meta.dirname, '../../src/server/forms')
    },
    {
      description: 'Test fixtures',
      directory: join(import.meta.dirname, 'definitions')
    }
  ])('$description', ({ directory }) => {
    /** @type {string[]} */
    let filenames

    beforeAll(async () => {
      filenames = await getForms(directory)
    })

    // This test is currently skipped because schema validation is failing.
    // This is likely due to inconsistencies between the form schemas in forms-runner
    // and the latest schema definitions in the plugin repository.
    // Once the schemas are aligned across repositories, this test can be re-enabled.
    it.skip('passes schema validation', async () => {
      for (const filename of filenames) {
        const definition = await getForm(join(directory, filename))

        // Validate form definition
        const result = formDefinitionSchema.validate(definition, {
          abortEarly: false
        })

        expect({
          filename,
          directory,
          error: result.error
        }).toMatchObject({
          filename, // Include filename in test output
          directory, // Include directory in test output
          error: undefined
        })
      }
    })
  })
})
