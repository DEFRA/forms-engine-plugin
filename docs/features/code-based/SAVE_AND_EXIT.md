---
layout: default
title: Save and return
parent: Code-based Features
grand_parent: Features
render_with_liquid: false
---

# Save and Return

The forms engine supports save and exit capabilities through the `saveAndExit` plugin option. This feature enables advanced session handling for applications that need custom session storage, retrieval, and management beyond the default in-memory Redis cache.

## Overview

- **Generate custom cache keys** for session storage, e.g. if you want to cache by user ID
- **Hydrate sessions** from external data sources (e.g. pre-filling a form when making a return journey)
- **Persist session data** to external systems for long-term storage (e.g. Saving data to return later)

Using the above, users can save their progress and continue filling out forms later, even across different devices or browser sessions.

> **Note:** it is your responsibility to ensure any state that exists outside of the form engine is captured upon persistence and available during hydration, e.g. file uploads via CDP.

## Configuration

The `saveAndExit` option is configured when registering the forms engine plugin:

```js
await server.register({
  plugin: formsEnginePlugin,
  options: {
    // ... other options
    saveAndExit: {
      keyGenerator: (request) => string,
      sessionHydrator: (request) => Promise<FormSubmissionState | null>,
      sessionPersister: (state, request) => Promise<void>
    }
  }
})
```

## Functions

### keyGenerator

**Type:** `(request: RequestType) => string`

Generates a cache key used to store and retrieve user session state.

```js
const keyGenerator = (request) => {
  const { userId, businessId, grantId } = request.app.userContext
  return `${userId}:${businessId}:${grantId}`
}
```

**Parameters:**

- `request` - The Hapi request object containing user context and form parameters

**Returns:** A string that uniquely identifies the user's session

### sessionHydrator

**Type:** `(request: RequestType) => Promise<FormSubmissionState | null>`

Called when no session state is found in Redis cache. This function should fetch saved state from an external source (e.g., database, API) and return it in the same structure expected by the form engine. This will generally be the same value as provided as `state` to the `sessionPersister` function, so a user can resume their session.

```js
const sessionHydrator = async (request) => {
  const { userId, businessId, grantId } = request.app.userContext
  const key = `${userId}:${businessId}:${grantId}`

  try {
    const response = await fetch(`https://backend.api/state/${key}`)
    if (!response.ok) return null

    const state = await response.json()
    return state // Must match FormSubmissionState structure
  } catch (error) {
    request.logger.error('Failed to hydrate session', error)
    return null
  }
}
```

**Parameters:**

- `request` - The Hapi request object

**Returns:** Promise that resolves to either:

- `FormSubmissionState` object containing the user's saved form data
- `null` if no saved state is found or an error occurs

### sessionPersister

**Type:** `(state: FormSubmissionState, request: RequestType) => Promise<void>`

Called to persist session state to an external system for long-term storage.

```js
const sessionPersister = async (state, request) => {
  const { userId, businessId, grantId } = request.app.userContext
  const key = `${userId}:${businessId}:${grantId}`
  try {
    await fetch(`https://your-backend.api/state/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })

    request.logger.info(`Session persisted for key: ${key}`)
  } catch (error) {
    request.logger.error('Failed to persist session', error)
    throw error
  }
}
```

**Parameters:**

- `state` - The current form submission state to be persisted
- `request` - The Hapi request object

**Returns:** Promise that resolves when the state is successfully persisted

## Session Flow

The session management system works as follows:

1. **Key Generation**: When a user accesses a form, `keyGenerator` creates a unique cache key
2. **Cache Check**: The engine checks the cache for existing session data
3. **Hydration**: If no data exists in the cache, `sessionHydrator` is called to fetch from external storage
4. **Restoration**: Retrieved data is loaded back into Redis for fast access during the session
5. **Persistence**: When users save their progress, `sessionPersister` stores data to external storage

Notes:

- The rehydrated state must include enough information to satisfy schema validation on the current or next page.
- To properly resume a session, users should be redirected to the `/summary` page. The form engine will detect if the session state is incomplete, then the user will be redirected back to the last valid page.

## Data Structure

The `FormSubmissionState` object passed to and from session management functions contains:

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

## Error Handling

- `sessionHydrator` should return `null` if no saved state is found or if errors occur
- `sessionPersister` should throw errors if persistence fails
