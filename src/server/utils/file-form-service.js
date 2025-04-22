import fs from 'fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'

import Boom from '@hapi/boom'
import YAML from 'yaml'

/**
 * Create a deterministic UUID string
 * @param {string} seed - the seed string
 * @returns string
 */
function uuid(seed) {
  const hash = crypto
    .createHash('sha256')
    .update(seed.toString())
    .digest('hex')
    .substring(0, 36)
  const chars = hash.split('')

  chars[8] = '-'
  chars[13] = '-'
  chars[14] = '4'
  chars[18] = '-'
  chars[19] = '8'
  chars[23] = '-'

  return chars.join('')
}

/**
 * FileFormService
 */
class FileFormService {
  /**
   * @type {string}
   */
  #ext

  /**
   * @type {PartialFormMetadata}
   */
  #defaultMetadata

  /**
   * @type {Map<string, FormMetadata>}
   */
  #metadata = new Map()

  /**
   * @type {Map<string, FormDefinition>}
   */
  #definition = new Map()

  /**
   * @param {string} ext - the file type extension
   * @param {PartialFormMetadata} metadata - the default partial form metadata to use for all forms
   */
  constructor(ext, metadata) {
    this.#ext = ext.toLowerCase()
    this.#defaultMetadata = metadata
  }

  /**
   * @param {string} dir
   * @param {PartialFormMetadata} metadata - the partial metadata to use for this form
   */
  async addDir(dir, metadata = this.#defaultMetadata) {
    const dirents = await fs.readdir(dir, { withFileTypes: true })
    const fileEntries = dirents.filter(
      (entry) =>
        entry.isFile() &&
        path.extname(entry.name).toLowerCase() === `.${this.#ext}`
    )

    // Read each file
    for (const entry of fileEntries) {
      await this.addForm(
        `${entry.parentPath}${path.sep}${entry.name}`,
        metadata
      )
    }
  }

  /**
   * @param {string} filepath
   * @param {PartialFormMetadata} metadata - the metadata to use for this form
   */
  async addForm(filepath, metadata = this.#defaultMetadata) {
    const definition = await this.readFormDefintion(filepath)
    const filename = path.basename(filepath)
    const slug = path.basename(filename, `.${this.#ext}`)
    const id = uuid(filename)
    const title = definition.name ?? slug
    const fullMetadata = { ...metadata, id, slug, title }

    this.#metadata.set(slug, fullMetadata)
    this.#definition.set(id, definition)
  }

  /**
   * @param {string} path
   * @returns {Promise<FormDefinition>}
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async readFormDefintion(path) {
    throw new Error(
      `Error reading path '${path}'. 'readFormDefintion' not implemented in abstract class`
    )
  }

  /**
   * Get the form metadata by slug
   * @param {string} slug
   * @returns {FormMetadata}
   */
  getFormMetadata(slug) {
    const metadata = this.#metadata.get(slug)

    if (!metadata) {
      throw Boom.notFound(`Form '${slug}' not found`)
    }

    return metadata
  }

  /**
   * Get the form defintion by id
   * @param {string} id
   * @returns {FormDefinition}
   */
  getFormDefinition(id) {
    const definition = this.#definition.get(id)

    if (!definition) {
      throw Boom.notFound(`Form '${id}' not found`)
    }

    return definition
  }
}

/**
 * JsonFileFormService class
 * @augments FileFormService
 */
export class JsonFileFormService extends FileFormService {
  /**
   * @param {FormMetadata} metadata - the default metadata to use for all forms
   */
  constructor(metadata) {
    super('json', metadata)
  }

  /**
   * @param {string} path
   * @returns {Promise<FormDefinition>}
   */
  async readFormDefintion(path) {
    /**
     * @type {FormDefinition}
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const definition = JSON.parse(await fs.readFile(path, 'utf8'))

    return definition
  }
}

/**
 * YamlFileFormService class
 * @augments FileFormService
 */
export class YamlFileFormService extends FileFormService {
  /**
   * @param {FormMetadata} metadata - the default metadata to use for all forms
   */
  constructor(metadata) {
    super('yaml', metadata)
  }

  /**
   * @param {string} path
   * @returns {Promise<FormDefinition>}
   */
  async readFormDefintion(path) {
    /**
     * @type {FormDefinition}
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const definition = YAML.parse(await fs.readFile(path, 'utf8'))

    return definition
  }
}

/**
 * @import { FormMetadata, FormDefinition } from '@defra/forms-model'
 */

/**
 * Partial FormMetadata
 * @typedef {Omit<FormMetadata, "id" | "slug" | "title">} PartialFormMetadata
 */
