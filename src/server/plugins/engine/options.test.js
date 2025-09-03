import { validatePluginOptions } from '~/src/server/plugins/engine/options.js'

describe('validatePluginOptions', () => {
  it('returns the validated value for valid options', () => {
    /**
     * @type {PluginOptions}
     */
    const validOptions = {
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
        paths: ['src/server/devserver'] // custom layout to make it really clear this is not the same as the runner
      },
      viewContext: () => {
        return { hello: 'world' }
      },
      baseUrl: 'http://localhost:3009'
    }

    expect(validatePluginOptions(validOptions)).toEqual(validOptions)
  })

  it('accepts optional property saveAndExit', () => {
    /**
     * @type {PluginOptions}
     */
    const validOptionsWithOptionals = {
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
        paths: ['src/server/devserver']
      },
      viewContext: () => {
        return { hello: 'world' }
      },
      baseUrl: 'http://localhost:3009',
      saveAndExit: (request, h) => h.redirect('/save-and-exit')
    }

    expect(validatePluginOptions(validOptionsWithOptionals)).toEqual(
      validOptionsWithOptionals
    )
  })

  /**
   * tsc would usually check compliance with the type, but given a user might be using plain JS we still want a test
   */
  it('fails if a required attribute is missing', () => {
    const invalidOptions =
      /** @type {PluginOptions} testing without viewContext */ ({
        nunjucks: {
          baseLayoutPath: 'dxt-devtool-baselayout.html',
          paths: ['src/server/devserver'] // custom layout to make it really clear this is not the same as the runner
        }
      })

    expect(() => validatePluginOptions(invalidOptions)).toThrow(
      'Invalid plugin options'
    )
  })
})

/**
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 */
