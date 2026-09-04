const { lstatSync } = require('fs')
const path = require('path')

const { CI } = process.env

/**
 * Whether `@defra/forms-model` is `npm link`ed to a local checkout rather than
 * installed from the registry.
 * @returns {boolean}
 */
function isModelLinked() {
  try {
    return lstatSync(
      path.join(__dirname, 'node_modules/@defra/forms-model')
    ).isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * Jest config
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  resetMocks: true,
  resetModules: true,
  restoreMocks: true,
  clearMocks: true,
  silent: false,
  testMatch: [
    '<rootDir>/src/**/*.test.{cjs,js,mjs,ts}',
    '<rootDir>/test/**/*.test.{cjs,js,mjs,ts}',
    '<rootDir>/scripts/**/*.test.{js,ts}'
  ],
  reporters: CI
    ? [['github-actions', { silent: false }], 'summary']
    : ['default', 'summary'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{cjs,js,mjs,ts}',
    '<rootDir>/scripts/**/*.{cjs,js,mjs}'
  ],
  modulePathIgnorePatterns: ['<rootDir>/coverage/', '<rootDir>/.server/'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    '<rootDir>/src/client/(?!javascripts)',
    '<rootDir>/src/client/javascripts/application.js',
    '<rootDir>/test'
  ],
  coverageDirectory: '<rootDir>/coverage',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.environment.js', 'jest-extended/all'],
  transform: {
    '^.+\\.(cjs|js|mjs|ts)$': [
      'babel-jest',
      {
        browserslistEnv: 'node',
        plugins: ['transform-import-meta'],
        rootMode: 'upward'
      }
    ]
  },

  // Enable Babel transforms for node_modules
  // See: https://jestjs.io/docs/ecmascript-modules
  transformIgnorePatterns: [
    `node_modules/(?!${[
      '@defra/forms-model/.*',
      'nanoid', // Supports ESM only
      'slug', // Supports ESM only
      '@defra/hapi-tracing', // Supports ESM only
      'geodesy' // Supports ESM only
    ].join('|')}/)`
  ],
  moduleNameMapper: {
    // `joi` is a peer dependency of `@defra/forms-model`, so the consumer is
    // meant to supply it. When that package is `npm link`ed to a local
    // checkout, its realpath resolves `joi` to the linked repo's own copy
    // instead, leaving two physical copies in one Jest registry. Joi keys
    // schemas off a global `Symbol.for()` (so those still interoperate) but
    // keys templates off a plain `Symbol()`, so a template built by one copy
    // is unrecognised by the other and gets recompiled without its custom
    // functions.
    //
    // Only applied while linked: this maps on the specifier rather than the
    // importer, so it would otherwise also pull nested copies (`hapi-pulse`
    // pins `joi@~17.9.2`) onto the root version.
    ...(isModelLinked() ? { '^joi$': '<rootDir>/node_modules/joi' } : {}),
    '^@defra/interactive-map$':
      '<rootDir>/test/__mocks__/@defra/interactive-map.js',
    '^@defra/interactive-map/plugins/datasets/adapters/(.*)$':
      '<rootDir>/test/__mocks__/@defra/interactive-map/plugins/datasets/adapters/$1.js',
    '^@defra/interactive-map/plugins/(.*)$':
      '<rootDir>/test/__mocks__/@defra/interactive-map/plugins/$1.js',
    '^@defra/interactive-map/providers/(.*)$':
      '<rootDir>/test/__mocks__/@defra/interactive-map/providers/$1.js'
  },
  testTimeout: 10000,
  forceExit: true
}
