import {
  hasComponentsEvenIfNoNext,
  type FormDefinition,
  type FormMetadata
} from '@defra/forms-model'

import { type FormDefinitionTranslations } from '~/src/server/plugins/engine/i18n/types.js'

type BaseTranslations = FormDefinitionTranslations[string]

export function extractBaseTranslations(
  def: FormDefinition,
  meta: FormMetadata
): BaseTranslations {
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

  const metadata = buildMetadataTranslations(meta)

  return { pages, components, sections, listItems, metadata }
}

function flattenObject(obj: unknown, prefix = ''): Record<string, unknown> {
  const result: Record<string, string> = {}

  if (
    obj === null ||
    typeof obj !== 'object' ||
    obj instanceof Date ||
    Array.isArray(obj)
  ) {
    return result
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (
      value === null ||
      typeof value !== 'object' ||
      value instanceof Date ||
      Array.isArray(value)
    ) {
      result[fullKey] = value as string
    } else {
      Object.assign(result, flattenObject(value, fullKey))
    }
  }

  return result
}

const unwantedFields = [
  'id',
  'slug',
  'versions',
  'offline',
  'termsAndConditionsAgreed',
  'draft',
  'live',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy'
]

function stripUnwantedFields(meta: FormMetadata) {
  const stripped = structuredClone(meta)
  const fieldsPresent = new Set(Object.keys(meta))
  unwantedFields.forEach((fieldName) => {
    if (fieldsPresent.has(fieldName)) {
      // @ts-expect-error - dynamic field name
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete stripped[fieldName]
    }
  })
  return stripped
}

function buildMetadataTranslations(meta: FormMetadata) {
  const strippedMeta = stripUnwantedFields(meta)

  return flattenObject(strippedMeta) as BaseTranslations['metadata']
}
