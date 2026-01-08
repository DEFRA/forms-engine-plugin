import { FileUploadField } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { type FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'

/**
 * Thrown when a component has an invalid state. This is typically only required where state needs
 * to be checked against an external source upon submission of a form. For example: file upload
 * has internal state (file upload IDs) but also external state (files in S3). The internal state
 * is always validated by the engine, but the external state needs validating too.
 *
 * This should be used within a formComponent.onSubmit(...).
 */
export class InvalidComponentStateError extends Error {
  public readonly component: FormComponent
  public readonly userMessage: string

  constructor(component: FormComponent, userMessage: string) {
    const message = `Invalid component state for: ${component.name}`
    super(message)
    this.name = 'InvalidComponentStateError'
    this.component = component
    this.userMessage = userMessage
  }

  getStateKeys() {
    const extraStateKeys =
      this.component instanceof FileUploadField ? ['upload'] : []

    return [this.component.name].concat(extraStateKeys)
  }
}
