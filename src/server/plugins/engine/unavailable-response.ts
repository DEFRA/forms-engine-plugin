import { type Request, type ResponseToolkit, type Server } from '@hapi/hapi'

import { isOfflineBoom } from '~/src/server/plugins/engine/form-availability.js'
import { unavailableViewModel } from '~/src/server/plugins/engine/models/unavailable-view-model.js'

/**
 * Registers a server-wide onPreResponse extension that intercepts the offline
 * Boom thrown and renders the unavailable view.
 *
 * Must be registered after the engine's routes so it sees their responses,
 * but before any global error-page handler that would re-shape Boom errors.
 */
export function registerUnavailableResponse(server: Server) {
  server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
    const response = request.response
    if (!isOfflineBoom(response)) {
      return h.continue
    }

    return h
      .view('unavailable', unavailableViewModel(response.data.metadata))
      .header('Cache-Control', 'no-store, no-cache, must-revalidate')
      .header('X-Robots-Tag', 'noindex, nofollow')
      .code(200)
      .takeover()
  })
}
