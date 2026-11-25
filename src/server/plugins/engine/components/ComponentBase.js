import { isConditionalRevealType } from '@defra/forms-model'
import joi from 'joi'

export class ComponentBase {
  /** @type {string | undefined} */
  id

  /** @type {PageControllerClass | undefined} */
  page

  /** @type {Component | undefined} */
  parent

  /** @type {ComponentCollection | undefined} */
  collection

  /** @type {ComponentDef['type']} */
  type

  /** @type {ComponentDef['name']} */
  name

  /** @type {ComponentDef['title']} */
  title

  /** @type {Extract<ComponentDef, { schema?: object }>['schema'] | undefined} */
  schema

  /** @type {Extract<ComponentDef, { options: object }>['options'] | undefined} */
  options

  isFormComponent = false

  /** @type {FormModel} */
  model

  /** @type {ComponentDef} */
  def

  /**
   * joi schemas based on a component defined in the form JSON. This validates a user's answer and is generated from {@link ComponentDef}
   * @type {ComponentSchema}
   */
  formSchema = joi.string()

  /** @type {ComponentSchema} */
  stateSchema = joi.string()

  /**
   * @param {ComponentDef} def
   * @param {{ page?: PageControllerClass, parent?: Component, model: FormModel }} props
   */
  constructor(def, props) {
    this.id = def.id
    this.type = def.type
    this.name = def.name
    this.title = def.title
    this.def = def

    if ('schema' in def) {
      this.schema = def.schema
    }

    if ('options' in def) {
      this.options = def.options
    }

    this.page = props.page
    this.parent = props.parent
    this.model = props.model
  }

  get viewModel() {
    const { options, type } = this

    /** @type {ViewModel} */
    const viewModel = {
      attributes: {}
    }

    if (!options) {
      return viewModel
    }

    if ('autocomplete' in options) {
      viewModel.attributes.autocomplete = options.autocomplete
    }

    if ('classes' in options) {
      viewModel.classes = options.classes
    }

    if ('condition' in options && isConditionalRevealType(type)) {
      viewModel.condition = options.condition
    }

    return viewModel
  }
}

/**
 * @typedef {ArraySchema<string[]> | ArraySchema<number[]> | ArraySchema<boolean[]> | ArraySchema<object[]> | BooleanSchema<string> | BooleanSchema | DateSchema | NumberSchema<string> | NumberSchema | ObjectSchema | StringSchema} ComponentSchema
 */

/**
 * @import { ComponentDef } from '@defra/forms-model'
 * @import { ArraySchema, BooleanSchema, DateSchema, NumberSchema, ObjectSchema, StringSchema } from 'joi'
 * @import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
 * @import { Component } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { ViewModel } from '~/src/server/plugins/engine/components/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 */
