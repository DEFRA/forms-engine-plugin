import { FileUploadField } from "~/src/server/plugins/engine/components/FileUploadField.js";
import { type FormComponent } from "~/src/server/plugins/engine/components/FormComponent.js";

export class InvalidComponentStateError extends Error {
    public readonly components: FormComponent[];
    public readonly userMessage: string;

    constructor(components: FormComponent[], userMessage: string) {
        const message = `Invalid component state for: ${components.map(c => c.name).join(', ')}`
        super(message)
        this.name = 'InvalidComponentStateError'
        this.components = components
        this.userMessage = userMessage
    }

    getStateKeys() {
        const extraStateKeys = this.components.some(c => c instanceof FileUploadField) ? ['upload'] : []

        return this.components.map(c => c.name).concat(extraStateKeys)
    }
}