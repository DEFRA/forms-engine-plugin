import pulse from 'hapi-pulse'

export default /** @satisfies {ServerRegisterPluginObject<{ timeout: number }>} */ ({
  plugin: pulse,
  options: {
    timeout: 800
  }
})

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
