import { t as resolveKey } from '~/src/server/plugins/engine/i18n/index.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'

/**
 * Shared Translator stub for tests where translation content is not the focus.
 * Uses the real English i18n keys so tests that assert on English text still pass.
 * tContent returns the entity's raw property value (title, hint, etc.).
 */
export const stubTranslator: Translator = {
  t: (key: string, opts?: Record<string, unknown>) =>
    resolveKey(key, 'en-GB', opts),
  tContent: ((entity: unknown, prop: string) =>
    typeof entity === 'object' && entity !== null
      ? (((entity as Record<string, unknown>)[prop] as string | undefined) ??
        '')
      : '') as unknown as Translator['tContent']
}
