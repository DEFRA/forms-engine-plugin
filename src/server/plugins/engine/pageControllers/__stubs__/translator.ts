import { t as resolveKey } from '~/src/server/plugins/engine/i18n/index.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'

/**
 * Shared Translator stub for tests where translation content is not the focus.
 * Uses the real English i18n keys so tests that assert on English text still pass.
 * tContent resolves the entity's property via the real English t() so i18n key
 * constants (e.g. 'components.yesNoField.yes') are resolved to their English
 * values ("Yes") rather than returned verbatim.
 */
export const stubTranslator: Translator = {
  t: (key: string, opts?: Record<string, unknown>) =>
    resolveKey(key, 'en-GB', opts),
  tContent: ((entity: unknown, prop: string) => {
    if (typeof entity !== 'object' || entity === null) return ''
    const raw =
      ((entity as Record<string, unknown>)[prop] as string | undefined) ?? ''
    if (!raw) return ''
    // Resolve via real English i18n: handles key constants like
    // 'components.yesNoField.yes' → "Yes". Plain strings pass through unchanged.
    return resolveKey(raw, 'en-GB') || raw
  }) as unknown as Translator['tContent']
}
