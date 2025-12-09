import { FileUploadField } from "~/src/server/plugins/engine/components/FileUploadField.js";
import { type FormComponent } from "~/src/server/plugins/engine/components/FormComponent.js";

export class InvalidComponentStateError extends Error {
    public readonly component: FormComponent;
    public readonly userMessage: string;

    constructor(component: FormComponent, userMessage: string) {
        const message = `Invalid component state for: ${component.name}`
        super(message)
        this.name = 'InvalidComponentStateError'
        this.component = component
        this.userMessage = userMessage
    }

    getStateKeys() {
        const extraStateKeys = this.component instanceof FileUploadField ? ['upload'] : []

        return [this.component.name].concat(extraStateKeys)
    }
}