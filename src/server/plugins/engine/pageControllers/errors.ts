import { FileUploadField } from "../components/FileUploadField.js";
import { FormComponent } from "../components/FormComponent.js";

export class InvalidComponentStateError extends Error {
    public readonly components: FormComponent[];

    constructor(components: FormComponent[]) {
        const message = `Invalid component state for: ${components.map(c => c.name).join(', ')}`
        super(message)
        this.name = 'InvalidComponentStateError'
        this.components = components
    }

    getStateKeys() {
        const extraStateKeys = this.components.some(c => c instanceof FileUploadField) ? ['upload'] : []

        return this.components.map(c => c.name).concat(extraStateKeys)
    }
}