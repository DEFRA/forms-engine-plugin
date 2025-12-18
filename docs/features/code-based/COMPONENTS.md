---
layout: default
title: Components
parent: Code-based Features
grand_parent: Features
nav_order: 6
---

# Components

This guide covers key concepts for developing components.

## Overview

Components are the building blocks of forms in the engine. Components usually extend from two base classes:

- ComponentBase: general components that display content on the page, such as Markdown or HTML components.

- FormComponents: these components are specialised components that take user input. They represent individual form fields and controls (text inputs, file uploads, radios, checkboxes, etc.) and handle their own validation, state management, and rendering.

> [!NOTE]
> Custom components are currently not supported when registering the plugin. Whilst you can develop custom pages as a plugin consumer, custom components must be built into the core engine.

## Post-processing component state on form submission

### Overview

The `InvalidComponentStateError` is a specialised exception thrown by form components during submission when their external state has become invalid or inconsistent with their internal state. This mechanism provides a graceful recovery path for components that interact with external systems, allowing the form engine to reset the component's state and prompt the user to re-enter data rather than failing the entire submission.

### Why it's necessary

#### Internal vs external state

The forms engine automatically validates **internal state** - data stored in the user's session that represents their answers to form fields. However, some components maintain **external state** in addition to internal state:

- **Internal State**: Data stored in the user's session (e.g., file upload IDs, reference numbers)
- **External State**: Data stored in external systems (e.g., files in S3, payment records in a payment provider)

#### The problem

External state can become invalid between the time a user enters data and when they submit the form. For example:

- **File Uploads**: A user uploads files, receiving file IDs representing an external resource. Those files are stored in S3 with a retrieval key. Later, when submitting the form:
  - The files may have expired (TTL exceeded)
  - The retrieval key may have become invalid
  - The files may have been deleted from S3
- **Payments**: A user initiates a payment and returns to the form. When submitting:
  - The payment session may have expired
  - The payment may have been cancelled externally

#### The solution

Rather than failing the entire submission with an unrecoverable error, components can throw `InvalidComponentStateError` to trigger a controlled recovery process:

1. The component throws the error with a user-friendly message
2. The form engine catches the error
3. The component's internal state is cleared from the session
4. The user is redirected back to the component's page
5. An error message is displayed to the user
6. The user can re-enter the data and continue

### How it works

Components throw the exception in their `onSubmit()` method when they detect invalid external state. The component does not handle state clearing - it only throws the error.

#### Submission flow

```
1. User clicks "Submit" on summary page
  ↓
2. SummaryPageController.handleFormSubmit()
  ↓
3. finaliseComponents() - validates external state for each component
  ↓
4. component.onSubmit() called for each component
  ↓
5. Component validates external state
  ↓
6a. [Success Path]                    6b. [Invalid State Path]
  External state valid                  External state invalid
  ↓                                     ↓
  Continue submission                   throw InvalidComponentStateError
                                        ↓
                                      7. SummaryPageController catches error
                                        ↓
                                      8. Flash error message to user
                                        ↓
                                      9. CacheService.resetComponentStates()
                                        - Clears component data from session
                                        ↓
                                      10. Redirect to component's page
                                        ↓
                                      11. User sees error and can re-enter data
```

#### Catching the exception (controller level)

The exception is caught and handled by the **SummaryPageController** during form submission.

**Location**: `src/server/plugins/engine/pageControllers/SummaryPageController.ts`

The controller:

1. Catches `InvalidComponentStateError` during `finaliseComponents()`
2. Creates a GOV.UK error message object
3. Flashes the error to the user's session
4. Calls `cacheService.resetComponentStates()` to clear the component's state
5. Redirects the user back to the component's page

### How to implement it for a component

Override the `onSubmit()` method in your component class. This method is called during form submission to finalise any external state.

```typescript
import { InvalidComponentStateError } from '~/src/server/plugins/engine/pageControllers/errors.js'

async onSubmit(
  request: FormRequestPayload,
  metadata: FormMetadata,
  context: FormContext
) {
  const value = this.getData(context.state)

  if (!value) {
    return // No data to validate
  }

  try {
    // Attempt to validate/finalise external state
    await this.validateExternalState(value)
  } catch (error) {
    // Check if this is a recoverable error
    if (this.isRecoverableError(error)) {
      throw new InvalidComponentStateError(
        this,
        'There was a problem with your [data type]. Please [action] before submitting the form again.'
      )
    }

    // Non-recoverable errors should be re-thrown
    throw error
  }
}
```
