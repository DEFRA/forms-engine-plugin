import Joi from 'joi'

/**
 * @param {string} expr
 * @returns {JoiExpression}
 */
export function createJoiExpression(expr) {
  return /** @type {JoiExpression} */ (
    /** @type {unknown} */ (Joi.expression(expr))
  )
}

/**
 * @import { JoiExpression } from 'joi'
 */
