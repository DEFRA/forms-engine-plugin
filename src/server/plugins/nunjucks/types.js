/**
 * @typedef {object} MacroOptions
 * @property {string} [callBlock] - Nunjucks call block content
 * @property {object} [params] - Nunjucks macro params
 */

/**
 * @typedef {object} RenderOptions
 * @property {object} [context] - Nunjucks render context
 */

/**
 * @typedef {object} ViewContext - Nunjucks view context
 * @property {string} [baseLayoutPath] - Base layout path
 * @property {string} [crumb] - Cross-Site Request Forgery (CSRF) token
 * @property {string} [cspNonce] - Content Security Policy (CSP) nonce
 * @property {string} [currentPath] - Current path
 * @property {string} [previewMode] - Preview mode
 * @property {string} [slug] - Form slug
 * @property {FormContext} [context] - the current form context
 */

/**
 * @typedef NunjucksContext
 * @property {ViewContext} ctx - the current nunjucks view context
 */

/**
 * @import { config } from '~/src/config/index.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { PluginOptions } from '~/src/server/plugins/engine/plugin.js'
 */
