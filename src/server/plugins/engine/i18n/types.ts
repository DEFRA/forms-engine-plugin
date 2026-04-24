import {
  type ComponentDef,
  type Item,
  type Page,
  type Section
} from '@defra/forms-model'

/**
 * Structure of the `translations` block in a form definition.
 * Also used to derive the valid property keys for tContent overloads.
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
 * Translates form-authored content (titles, hints, etc.) by passing the
 * source entity object and property name. Internally constructs the i18next
 * key from the entity's GUID. Falls back to entity[prop] when no GUID or
 * no translation found.
 *
 * Valid property names are derived from FormDefinitionTranslations — one
 * source of truth; the compiler enforces correctness.
 */
export interface TContentFunction {
  (
    entity: ComponentDef,
    prop: keyof EntityTranslations['components'][string]
  ): string
  (entity: Page, prop: keyof EntityTranslations['pages'][string]): string
  (entity: Section, prop: keyof EntityTranslations['sections'][string]): string
  (entity: Item, prop: keyof EntityTranslations['listItems'][string]): string
}

/**
 * Scoped translator pair returned by model.createTranslator(language).
 * t        — plugin + host namespace (UI strings, buttons, errors, sub-field labels)
 * tContent — form namespace only (question titles, hints, page titles, list item text)
 */
export interface Translator {
  t: (key: string, opts?: Record<string, unknown>) => string
  tContent: TContentFunction
}
