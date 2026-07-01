import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'

/**
 * Nunjucks filter to get the answer for a component
 * @this {NunjucksContext}
 * @param {string} name - The name of the component to check
 */
export function answer(name) {
  const { context } = this.ctx

  if (!context) {
    return undefined
  }

  const component = context.componentMap.get(name)

  if (!component?.isFormComponent) {
    return undefined
  }

  const field = /** @type {Field} */ (component)
  const translator = field.model.createTranslator()
  return getAnswer(field, context.relevantState, translator, {
    format: 'summary'
  })
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 * @import { Field } from '~/src/server/plugins/engine/components/helpers/components.js'
 */
