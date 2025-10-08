import { getErrorMessage } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { createServer } from '~/src/server/index.js'

const logger = createLogger()

process.on('unhandledRejection', (error) => {
  const err = getErrorMessage(error)
  logger.info('Unhandled rejection')
  logger.error(err, `[unhandledRejection] Unhandled promise rejection: ${err}`)
  throw error
})

const port = config.get('port')
const ordnanceSurveyApiKey = config.get('ordnanceSurveyApiKey')

/**
 * Main entrypoint to the application.
 */
async function startServer() {
  const server = await createServer({ ordnanceSurveyApiKey })
  await server.start()

  process.send?.('online')

  server.logger.info('Server started successfully')
  server.logger.info(`Access your frontend on http://localhost:${port}`)
}

startServer().catch((error: unknown) => {
  const err = getErrorMessage(error)
  logger.info('Server failed to start :(')
  logger.error(err, `[serverStartup] Server failed to start: ${err}`)
  throw error
})
