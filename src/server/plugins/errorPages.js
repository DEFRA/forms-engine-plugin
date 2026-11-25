/*
 * Add an `onPreResponse` listener to return error pages
 */
export default /** @satisfies {ServerRegisterPluginObject<void>} */ ({
  plugin: {
    name: 'error-pages',
    register(server) {
      server.ext(
        'onPreResponse',
        (/** @type {Request} */ request, /** @type {ResponseToolkit} */ h) => {
          const response = request.response

          if ('isBoom' in response && response.isBoom) {
            // An error was raised during
            // processing the request
            const statusCode = response.output.statusCode

            const err = {
              statusCode,
              message: response.message,
              stack: response.stack
            }

            request.logger.error(
              err,
              `[httpError] HTTP ${statusCode} error occurred - ${response.message} - path: ${request.path} - method: ${request.method}`
            )

            return h.response(err).code(statusCode)
          }

          return h.continue
        }
      )
    }
  }
})

/**
 * @import { Request, ResponseToolkit, ServerRegisterPluginObject } from '@hapi/hapi'
 */
