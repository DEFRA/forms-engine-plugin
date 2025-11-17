

import { ComponentBase } from '../components/ComponentBase.js'
import { DeclarationField } from '../components/DeclarationField.js'
import { FormComponent } from '../components/FormComponent.js'
import { ListFormComponent } from '../components/ListFormComponent.js'
import { LocationFieldBase } from '../components/LocationFieldBase.js'

import * as Components from '~/src/server/plugins/engine/components/index.js'

const baseClasses = new Map([
  [ComponentBase, 'guidance'],
  [FormComponent, 'base'],
  [ListFormComponent, 'list'],
  [LocationFieldBase, 'location'],
  [DeclarationField, 'misc']
])

/**
 * Checks whether a given class is a subclass (directly or indirectly)
 * of another base class.
 * @template {new (...args: any[]) => any} TBase
 * @param {Function} subclass - The potential subclass to test.
 * @param {TBase} baseClass - The base class constructor.
 * @returns {boolean} True if subclass extends baseClass.
 */
function isSubclassOf(subclass, baseClass) {
  let proto = Object.getPrototypeOf(subclass)
  while (proto && proto !== Function.prototype) {
    if (proto === baseClass) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}

export function categoriseComponents() {
  const componentMap = new Map(Object.entries(Components))

  // Create categories map: category name (from baseClasses value) => []
  const categories = new Map()
  for (const category of baseClasses.values()) {
    categories.set(category, [])
  }

  for (const [, component] of componentMap.entries()) {
    for (const [baseClass, category] of baseClasses.entries()) {
      if (isSubclassOf(component, baseClass)) {
        categories.get(category).push(component)
        break // prevent reclassification. first match is the category.
      }
    }
  }

  return categories
}


/**
 * Generate a hardcoded form definition with one page per category.
 * Each page contains components matching the category.
 * @param {object} [metadata] - Optional metadata to include in the form definition.
 * @returns {import('@defra/forms-model').FormDefinition}
 */
export function generateAutoComponentsForm() {
  const categories = categoriseComponents()
  const pages = []

  for (const [category, components] of categories.entries()) {
    pages.push({
      path: `/${category}`,
      controller: "QuestionPageController",
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Components`,
      components: components.map((Component) => ({
        type: Component.name,
        // You can add more fields here if needed
      }))
    })
  }

  return {
    id: 'auto-components-form',
    title: 'Auto Components Form',
    pages
  }
}
