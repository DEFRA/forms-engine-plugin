import { t as resolveKey } from '~/src/server/plugins/engine/i18n/index.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'

/**
 * Shared Translator stub for tests where translation content is not the focus.
 * Uses the real English i18n keys so tests that assert on English text still pass.
 * Each tX function resolves the entity's property via the real English t() so
 * i18n key constants (e.g. 'components.yesNoField.yes') resolve to their English
 * values ("Yes") rather than being returned verbatim.
 */
function resolveEntity(entity: unknown, prop: string): string {
  if (typeof entity !== 'object' || entity === null) return ''
  const raw =
    ((entity as Record<string, unknown>)[prop] as string | undefined) ?? ''
  if (!raw) return ''
  return resolveKey(raw, 'en-GB') || raw
}

export const stubTranslator: Translator = {
  t: (key: string, opts?: Record<string, unknown>) =>
    resolveKey(key, 'en-GB', opts),
  tPage: (entity, prop) => resolveEntity(entity, prop as string),
  tComponent: (entity, prop) => resolveEntity(entity, prop as string),
  tSection: (entity, prop) => resolveEntity(entity, prop as string),
  tListItem: (entity, prop) => resolveEntity(entity, prop as string)
}
