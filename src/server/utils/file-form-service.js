import fs from 'fs/promises'
import path from 'node:path'

import YAML from 'yaml'

/**
 * FileFormService class
 */
export class FileFormService {
  /**
   * The map of form metadatas by slug
   * @type {Map<string, FormMetadata>}
   */
  #metadata = new Map()

  /**
   * The map of form definitions by id
   * @type {Map<string, FormDefinition>}
   */
  #definition = new Map()

  /**
   * Add form from a file
   * @param {string} filepath - the file path
   * @param {FormMetadata} metadata - the metadata to use for this form
   * @returns {Promise<FormDefinition>}
   */
  async addForm(filepath, metadata) {
    const definition = await this.readForm(filepath)

    this.#metadata.set(metadata.slug, metadata)
    this.#definition.set(metadata.id, definition)

    return definition
  }

  /**
   * Read the form definition from file
   * @param {string} filepath - the file path
   * @returns {Promise<FormDefinition>}
   */
  async readForm(filepath) {
    const ext = path.extname(filepath).toLowerCase()

    switch (ext) {
      case '.json':
        return this.readJsonForm(filepath)
      case '.yaml':
        return this.readYamlForm(filepath)
      default:
        throw new Error(`Invalid file extension '${ext}'`)
    }
  }

  /**
   * Read the form definition from a json file
   * @param {string} filepath - the file path
   * @returns {Promise<FormDefinition>}
   */
  async readJsonForm(filepath) {
    /**
     * @type {FormDefinition}
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const definition = JSON.parse(await fs.readFile(filepath, 'utf8'))

    return definition
  }

  /**
   * Read the form definition from a yaml file
   * @param {string} filepath - the file path
   * @returns {Promise<FormDefinition>}
   */
  async readYamlForm(filepath) {
    /**
     * @type {FormDefinition}
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const definition = YAML.parse(await fs.readFile(filepath, 'utf8'))

    return definition
  }

  /**
   * Get the form metadata by slug
   * @param {string} slug - the form slug
   * @returns {FormMetadata}
   */
  getFormMetadata(slug) {
    const metadata = this.#metadata.get(slug)

    if (!metadata) {
      throw new Error(`Form metadata '${slug}' not found`)
    }

    return metadata
  }

  /**
   * Get the form defintion by id
   * @param {string} id - the form id
   * @returns {FormDefinition}
   */
  getFormDefinition(id) {
    const definition = this.#definition.get(id)

    if (!definition) {
      throw new Error(`Form definition '${id}' not found`)
    }

    return definition
  }

  /**
   * Returns a FormsService compliant interface
   * @returns {import('~/src/server/types.js').FormsService}
   */
  toFormsService() {
    return {
      /**
       * Get the form metadata by slug
       * @param {string} slug
       * @returns {Promise<FormMetadata>}
       */
      getFormMetadata: (slug) => {
        return Promise.resolve(this.getFormMetadata(slug))
      },

      /**
       * Get the form defintion by id
       * @param {string} id
       * @returns {Promise<FormDefinition>}
       */
      getFormDefinition: (id) => {
        return Promise.resolve(this.getFormDefinition(id))
      }
    }
  }
}

/**
 * @import { FormMetadata, FormDefinition } from '@defra/forms-model'
 */
