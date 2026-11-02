import Joi, { type JoiExpression } from 'joi'

export function createJoiExpression(expr: string): JoiExpression {
  return Joi.expression(expr) as unknown as JoiExpression
}
