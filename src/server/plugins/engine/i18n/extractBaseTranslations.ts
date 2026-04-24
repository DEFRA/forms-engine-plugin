import {
  hasComponentsEvenIfNoNext,
  type FormDefinition
} from '@defra/forms-model'

import { type FormDefinitionTranslations } from '~/src/server/plugins/engine/i18n/types.js'

type BaseTranslations = FormDefinitionTranslations[string]

export function extractBaseTranslations(def: FormDefinition): BaseTranslations {
  const pages: BaseTranslations['pages'] = {}
  const components: BaseTranslations['components'] = {}
  const sections: BaseTranslations['sections'] = {}
  const listItems: BaseTranslations['listItems'] = {}

  for (const page of def.pages) {
    if (page.id && page.title) {
      pages[page.id] = { title: page.title }
    }

    if (hasComponentsEvenIfNoNext(page)) {
      for (const component of page.components) {
        if (!component.id) continue

        const entry: BaseTranslations['components'][string] = {}

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

  return { pages, components, sections, listItems }
}
