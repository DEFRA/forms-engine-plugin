import { isOfflineBoom } from '~/src/server/plugins/engine/form-availability.js'
import { unavailableViewModel } from '~/src/server/plugins/engine/models/unavailable-view-model.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

/**
 * Registers a server-wide onPreResponse extension that intercepts the offline
 * Boom thrown and renders the unavailable view.
 *
 * Must be registered after the engine's routes so it sees their responses,
 * but before any global error-page handler that would re-shape Boom errors.
 * @param {Server} server
 */
export function registerUnavailableResponse(server) {
  server.ext(
    'onPreResponse',
    (/** @type {Request} */ request, /** @type {ResponseToolkit} */ h) => {
      const response = request.response
      if (!isOfflineBoom(response)) {
        return h.continue
      }

      const { metadata, definition } = response.data

      const language = resolveLanguage(
        /** @type {AnyFormRequest} */ (/** @type {unknown} */ (request))
      )

      return h
        .view(
          'unavailable',
          unavailableViewModel(metadata, definition, language)
        )
        .header('Cache-Control', 'no-store, no-cache, must-revalidate')
        .header('X-Robots-Tag', 'noindex, nofollow')
        .code(200)
        .takeover()
    }
  )
}

/**
 * @import { Request, ResponseToolkit, Server } from '@hapi/hapi'
 * @import { AnyFormRequest } from '~/src/server/plugins/engine/types.js'
 */
