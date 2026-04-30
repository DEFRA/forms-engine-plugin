import {
  type ComponentDef,
  type Item,
  type Page,
  type Section
} from '@defra/forms-model'

/**
 * Structure of the `translations` block in a form definition.
 * Also used to derive the valid property keys for the typed tX functions.
 */
export type FormDefinitionTranslations = Record<
  string,
  {
    pages: Record<string, Partial<Pick<Page, 'title'>>>
    // ComponentDef is a discriminated union; Pick across the full union is not feasible.
    // The four keys below are the complete set of translatable component properties.
    components: Record<
      string,
      Partial<{
        title: string
        hint: string
        content: string
        shortDescription: string
      }>
    >
    sections: Record<string, Partial<Pick<Section, 'title'>>>
    listItems: Record<string, Partial<Pick<Item, 'text'>>>
  }
>

type EntityTranslations = FormDefinitionTranslations[string]

/**
 * Scoped translator returned by model.createTranslator(language).
 * t          — plugin namespace (UI strings, buttons, errors, sub-field labels)
 * tPage      — form namespace: page titles
 * tComponent — form namespace: component titles, hints, shortDescriptions
 * tSection   — form namespace: section titles
 * tListItem  — form namespace: list item text
 */
export interface Translator {
  t: (key: string, opts?: Record<string, unknown>) => string
  tPage: (page: Page, prop: keyof EntityTranslations['pages'][string]) => string
  tComponent: (
    component: ComponentDef,
    prop: keyof EntityTranslations['components'][string]
  ) => string
  tSection: (
    section: Section,
    prop: keyof EntityTranslations['sections'][string]
  ) => string
  tListItem: (
    item: Item,
    prop: keyof EntityTranslations['listItems'][string]
  ) => string
}
