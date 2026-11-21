import joi from 'joi'

import {
  isFormState,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { createComponent } from '~/src/server/plugins/engine/components/helpers/components.js'
import { getTranslatedLabel } from '~/src/server/plugins/engine/components/helpers/index.js'
import { getErrors } from '~/src/server/plugins/engine/helpers.js'
import {
  buildLanguageMessages,
  validationOptions as opts
} from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

export class ComponentCollection {
  /** @type {PageControllerClass | undefined} */
  page

  /** @type {Component | undefined} */
  parent

  /** @type {FormModel} */
  model

  /** @type {Component[]} */
  components

  /** @type {Field[]} */
  fields

  /** @type {Guidance[]} */
  guidance

  /** @type {ObjectSchema<FormPayload>} */
  formSchema

  /** @type {ObjectSchema<FormSubmissionState>} */
  stateSchema

  /**
   * @param {ComponentDef[]} defs
   * @param {{ page?: PageControllerClass, parent?: Component, model: FormModel }} props
   * @param {object} [schema]
   * @param {string[]} [schema.peers] - Defines an all-or-nothing relationship between keys where if one
   * of the peers is present, all of them are required as well
   * @param {CustomValidator} [schema.custom] - Defines a custom validation rule for the object schema
   */
  constructor(defs, props, schema) {
    const components = defs.map((def) => createComponent(def, props))

    const fields = components.filter(
      /** @returns {component is Field} */
      (component) => component.isFormComponent
    )

    const guidance = components.filter(
      /** @returns {component is Guidance} */
      (component) => !component.isFormComponent
    )

    /** @type {ObjectSchema<FormPayload>} */
    let formSchema = joi.object().required()
    /** @type {ObjectSchema<FormSubmissionState>} */
    let stateSchema = joi.object().required()

    // Add each field or concat collection
    for (const field of fields) {
      const { collection, name } = field

      formSchema = collection
        ? formSchema.concat(collection.formSchema)
        : formSchema.keys({ [name]: field.formSchema })

      stateSchema = collection
        ? stateSchema.concat(collection.stateSchema)
        : stateSchema.keys({ [name]: field.stateSchema })
    }

    if (schema?.peers) {
      formSchema = formSchema.and(...schema.peers, {
        isPresent: isFormValue
      })
    }

    if (schema?.custom) {
      formSchema = formSchema.custom(schema.custom)
      stateSchema = stateSchema.custom(schema.custom)
    }

    this.page = props.page
    this.parent = props.parent
    this.model = props.model

    this.components = components
    this.fields = fields
    this.guidance = guidance

    this.formSchema = formSchema
    this.stateSchema = stateSchema
  }

  get keys() {
    return this.fields.flatMap((field) => {
      const { name, collection } = field

      if (collection) {
        const { fields } = collection
        return [name, ...fields.map(({ name }) => name)]
      }

      return [name]
    })
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormDataFromState(state) {
    /** @type {FormPayload} */
    const payload = {}

    this.fields.forEach((component) => {
      Object.assign(payload, component.getFormDataFromState(state))
    })

    return payload
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormValueFromState(state) {
    /** @type {FormPayload} */
    const payload = {}

    // Remove name prefix for formatted value
    for (const [name, value] of Object.entries(
      this.getFormDataFromState(state)
    )) {
      const key = name.split('__').pop()
      if (!key) {
        continue
      }

      payload[key] = value
    }

    return payload
  }

  /**
   * @param {FormPayload} payload
   */
  getStateFromValidForm(payload) {
    /** @type {FormState} */
    const state = {}

    this.fields.forEach((component) => {
      Object.assign(state, component.getStateFromValidForm(payload))
    })

    return state
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    /** @type {FormState} */
    const context = {}

    for (const component of this.fields) {
      context[component.name] = component.getContextValueFromState(state)
    }

    return context
  }

  /**
   * Get all errors for all fields in this collection
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getErrors(errors, translator) {
    return this.getFieldErrors(
      (field) => field.getErrors(errors, translator),
      errors
    )
  }

  /**
   * Get view errors for all fields in this collection.
   * For most fields this means filtering to the first error in the list.
   * Composite fields like UKAddress can choose to return more than one error.
   * @param {FormSubmissionError[]} [errors]
   * @param {Translator} [translator]
   * @returns {FormSubmissionError[] | undefined}
   */
  getViewErrors(errors, translator) {
    return this.getFieldErrors(
      (field) => field.getViewErrors(errors, translator),
      errors
    )
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const { components } = this

    /** @type {ComponentViewModel[]} */
    const result = components.map((component) => {
      const { isFormComponent, type } = component

      const model = component.getViewModel(context)

      return { type, isFormComponent, model }
    })

    return result
  }

  /**
   * @param {joi.ObjectSchema<FormPayload>} formSchema
   * @param {Translator} translator
   */
  overrideParentTitle(formSchema, translator) {
    // Add parent field title to collection field errors
    return formSchema.error((errors) => {
      return errors.flatMap((error) => {
        if (!isErrorContext(error.local) || error.local.title) {
          return error
        }

        // Use field key or first missing child field
        let { missing, key = missing?.[0] } = error.local

        // But avoid numeric key used by array payloads
        if (typeof key === 'number') {
          key = error.path[0]
        }

        // Find the parent field
        const parent = this.fields.find(
          (item) => item.name === key?.split('__').shift()
        )

        // Find the child field
        const child = (parent?.collection?.fields ?? this.fields).find(
          (item) => item.name === key
        )

        // Update error with child label. A composite field child has a key as
        // its title, so that the label shows in the language of the translator
        if (child && parent?.collection) {
          error.local.label = translator.t(child.title)
        } else if (
          child &&
          (!error.local.label || error.local.label === 'value')
        ) {
          error.local.label = child.title
        }

        // Fix error summary links for missing fields
        if (missing?.length) {
          error.path = missing
          error.local.key = missing[0]
        }

        // Update error with parent title
        if (parent) {
          error.local.title ??= getTranslatedLabel(parent.def, translator)
        }

        return error
      })
    })
  }

  /**
   * Validate form payload
   * @param {FormPayload} [value]
   * @param {Translator} [translator]
   * @returns {FormValidationResult<FormPayload>}
   */
  validate(value = {}, translator = this.model.createTranslator()) {
    const messages = buildLanguageMessages(translator.t)

    // Override Joi labels (and custom schema messages where needed) so that
    // #label/#title in message templates resolve in the language of the translator
    let schema = this.formSchema
    // Add parent field title to collection field errors
    schema = this.overrideParentTitle(schema, translator)

    const { t } = translator

    for (const field of this.fields) {
      if (field.collection) {
        // Composite field: translate each sub-field's label using the key constant
        // (e.g. 'components.addressField.line1' → "Llinell cyfeiriad 1") and apply
        // any field-type-specific message overrides (e.g. objectMissing for dates).
        const messagesOverride = field.getValidationMessagesOverride(translator)
        for (const subField of field.collection.fields) {
          const translatedSubLabel = t(subField.title) || subField.label
          let patchedSchema = subField.formSchema.label(translatedSubLabel)
          const subFieldMessages = messagesOverride
            ? messagesOverride[subField.name]
            : undefined
          if (subFieldMessages) {
            patchedSchema = patchedSchema.messages(subFieldMessages)
          }
          schema = this.replaceFieldSchema(schema, subField.name, patchedSchema)
        }
      } else {
        const fieldDef = field.def
        const translatedLabel = getTranslatedLabel(fieldDef, translator)
        const messagesOverride = field.getValidationMessagesOverride(translator)
        let patchedSchema = field.formSchema
        if (translatedLabel && translatedLabel !== field.label) {
          patchedSchema = patchedSchema.label(translatedLabel)
        }
        const fieldMessages = messagesOverride
          ? messagesOverride[field.name]
          : undefined
        if (fieldMessages) {
          patchedSchema = patchedSchema.messages(fieldMessages)
        }
        if (patchedSchema !== field.formSchema) {
          schema = this.replaceFieldSchema(schema, field.name, patchedSchema)
        }
      }
    }

    const result = schema.validate(value, { ...opts, messages })

    const details = result.error?.details
    const { language } = translator

    return {
      value: /** @type {typeof value} */ (result.value ?? {}),
      errors:
        this.page?.getErrors(details, language) ?? getErrors(details, language)
    }
  }

  /**
   * Replace the schema of one field in the form schema. The field keeps its
   * position, so that the errors stay in the same order as the page
   * @private
   * @param {ObjectSchema<FormPayload>} formSchema
   * @param {string} name
   * @param {joi.Schema} fieldSchema
   */
  replaceFieldSchema(formSchema, name, fieldSchema) {
    return formSchema.fork(name, () => fieldSchema)
  }

  /**
   * Helper to get errors from all fields
   * @private
   * @param {(field: Field) => FormSubmissionError[] | undefined} callback
   * @param {FormSubmissionError[]} [errors]
   * @returns {FormSubmissionError[] | undefined}
   */
  getFieldErrors(callback, errors) {
    const { fields } = this

    if (!errors?.length) {
      return
    }

    /** @type {FormSubmissionError[]} */
    const list = []

    for (const field of fields) {
      const fieldErrors = callback(field)

      if (fieldErrors?.length) {
        list.push(...fieldErrors)
      }
    }

    if (!list.length) {
      return
    }

    return list
  }
}

/**
 * Check for field local state
 * @param {unknown} [value]
 * @returns {value is ErrorReportCollection['local']}
 */
export function isErrorContext(value) {
  return isFormState(value) && typeof value.label === 'string'
}

/**
 * @import { ComponentDef } from '@defra/forms-model'
 * @import { CustomValidator, ErrorReportCollection, ObjectSchema } from 'joi'
 * @import { Component, Field, Guidance } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { ComponentViewModel, RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { FormPayload, FormState, FormSubmissionError, FormSubmissionState, FormValidationResult } from '~/src/server/plugins/engine/types.js'
 */
