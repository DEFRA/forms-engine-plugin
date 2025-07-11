import { validatePluginOptions } from '~/src/server/plugins/engine/options.js'

describe('validatePluginOptions', () => {
  it('returns the validated value for valid options', () => {
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

  it('accepts optional properties keyGenerator, sessionHydrator, and sessionPersister', () => {
    const validOptionsWithOptionals = {
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
        paths: ['src/server/devserver']
      },
      viewContext: () => {
        return { hello: 'world' }
      },
      baseUrl: 'http://localhost:3009',
      keyGenerator: () => 'test-key',
      sessionHydrator: () => Promise.resolve({ someState: 'value' }),
      sessionPersister: () => Promise.resolve(undefined)
    }

    expect(validatePluginOptions(validOptionsWithOptionals)).toEqual(
      validOptionsWithOptionals
    )
  })

  /**
   * tsc would usually check compliance with the type, but given a user might be using plain JS we still want a test
   */
  it('fails if a required attribute is missing', () => {
    // viewContext is missing
    const invalidOptions = {
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
        paths: ['src/server/devserver'] // custom layout to make it really clear this is not the same as the runner
      }
    }

    // @ts-expect-error -- add a test for JS users
    expect(() => validatePluginOptions(invalidOptions)).toThrow(
      'Invalid plugin options'
    )
  })
})
