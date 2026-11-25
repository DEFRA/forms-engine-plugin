import { hasComponentsEvenIfNoNext } from '@defra/forms-model'

/**
 * @typedef {FormDefinitionTranslations[string]} BaseTranslations
 */

/**
 * @param {FormDefinition | undefined} def
 * @returns {BaseTranslations}
 */
export function extractBaseTranslations(def) {
  /** @type {BaseTranslations['pages']} */
  const pages = {}
  /** @type {BaseTranslations['components']} */
  const components = {}
  /** @type {BaseTranslations['sections']} */
  const sections = {}
  /** @type {BaseTranslations['listItems']} */
  const listItems = {}
  /** @type {BaseTranslations['form']} */
  const form = {}

  if (!def) {
    return { pages, components, sections, listItems, form }
  }

  for (const page of def.pages) {
    if (page.id && page.title) {
      pages[page.id] = { title: page.title }
    }

    if (hasComponentsEvenIfNoNext(page)) {
      for (const component of page.components) {
        if (!component.id) continue

        /** @type {BaseTranslations['components'][string]} */
        const entry = {}

        if (component.title) entry.title = component.title
        if ('hint' in component && component.hint) entry.hint = component.hint
        if ('content' in component && component.content) {
          entry.content = component.content
        }
        if ('shortDescription' in component && component.shortDescription) {
          entry.shortDescription = component.shortDescription
        }

        if (Object.keys(entry).length) {
          components[component.id] = entry
        }
      }
    }
  }

  for (const section of def.sections) {
    if (section.id && section.title) {
      sections[section.id] = { title: section.title }
    }
  }

  for (const list of def.lists) {
    for (const item of list.items) {
      if (item.id && item.text) {
        listItems[item.id] = { text: item.text }
      }
    }
  }

  form.title = def.name ?? ''

  return { pages, components, sections, listItems, form }
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { FormDefinitionTranslations } from '~/src/server/plugins/engine/i18n/types.js'
 */
