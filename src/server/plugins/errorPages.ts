import {
  type Request,
  type ResponseToolkit,
  type ServerRegisterPluginObject
} from '@hapi/hapi'

/*
 * Add an `onPreResponse` listener to return error pages
 */
export default {
  plugin: {
    name: 'error-pages',
    register(server) {
      server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
        const response = request.response

        if ('isBoom' in response && response.isBoom) {
          // An error was raised during
          // processing the request
          const statusCode = response.output.statusCode

          const error = {
            statusCode,
            data: response.data,
            message: response.message,
            stack: response.stack
          }

          request.log('error', error)

          return h.response(error).code(statusCode)
        }
        return h.continue
      })
    }
  }
} satisfies ServerRegisterPluginObject<void>
