---
layout: default
title: Save and exit
parent: Code-based Features
grand_parent: Features
render_with_liquid: false
---

# Save and Exit

The forms engine supports save and exit capabilities through the `saveAndExit` plugin option. This feature enables applications to support end users saving their current answers and returning to the form at a later date.

It does this by displaying a secondary button on each question page when the feature is enabled. When the button is clicked the form is submitted in the usual way and once the page data is validated, the provided `saveAndExit` handler is called. This is a standard hapi route handler with an additional `FormContext` parameter passed that contains the [current state of the users progression through the form](../../REQUEST_LIFECYCLE.md).

> **Note:** it is your responsibility to ensure any state that exists outside of the form engine is captured upon persistence and available during hydration, e.g. file uploads via CDP.

## Configuration

The `saveAndExit` option is configured when registering the forms engine plugin:

```ts
await server.register({
  plugin,
  options: {
    // ... other options
    saveAndExit: (
      request: FormRequestPayload,
      h: FormResponseToolkit,
      context: FormContext
    ): ResponseObject => {}
  }
})
```

It is down to you to provide the mechanism by which you want to store the users data and provide them a means by which they can return to it at a later data. The `saveAndExit` handler simply activates the additional button, gives you the hook point in to the framework and provides you the data you need to know where the user had progressed to.

One common approach is ask end users for their email and send them a "magic link" that they can use to return with 28 days.

```
// This example shows how you can support custom UI flows to allow an end user to save their form progress and return at a later date.
// The save and exit method is called like other hapi route handlers and expects a similar return value.
// Here we're redirecting the user to another page where we might be providing a magic link or similar that the user can use to return to the form with.
await server.register({
  plugin,
  options: {
    saveAndExit: (
      request: FormRequestPayload,
      h: FormResponseToolkit,
      context: FormContext
    ) => {
      const { params } = request
      const { slug } = params
      const usersAnswers = context.state

      // Redirect user to custom page to handle saving
      return h.redirect(`/custom-magic-link-save-and-exit/${slug}`)
    }
  }
})
```

## Data Structure

The `FormSubmissionState` object can be found at `context.state` and contains all the answers the user has provided so far.

This is the data you'll need to save to allow users to pick up from where they left.

```typescript
interface FormSubmissionState {
  // User's form field values
  [fieldName: string]: FormStateValue

  // Special system fields
  $$__referenceNumber?: string

  // File upload state (if applicable)
  upload?: Record<string, TempFileState>
}
```

## Restore session data

To restore a user's previous state use the `cacheService.setState` method.
The current request is passed in order to generate the cache key as so should include the correct form `slug` and `status` (if using the draft/live feature)

```js
await cacheService.setState(request, state)
```
