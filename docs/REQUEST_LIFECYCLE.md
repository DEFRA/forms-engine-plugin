---
layout: default
title: Request lifecycle
render_with_liquid: false
---

# Request Lifecycle

The `forms-engine-plugin` is built on top of Hapi.js and follows the standard Hapi request lifecycle while adding specialized layers for form handling, page controllers, and event execution.

## Overview

When a request is received, the engine processes it through several stages:

1. **Request Entry**

- The request enters the Hapi server and is matched to a route defined by the engine (see `getRoutes`).
- Supported routes include GET and POST for form pages, preview pages, and summary pages.

2. **Engine Processing (Routing and Context Preparation)**

- When a request matches a route, the engine first parses and validates all route parameters (such as `slug`, `path`, and `itemId` for repeaters) using predefined Joi schemas. These schemas ensure that only valid requests proceed further into the engine.
- For POST requests, the payload is validated against a dynamically constructed Joi schema based on the components within the form. Validation is performed against the `relevantState`, which represents the cumulative state for all pages leading up to the user's current position in the form journey. This ensures that only data that should be present at this point is validated, maintaining form flow integrity.
- If validation fails at this stage, the request is rejected and the user is redirected to the last valid position. This prevents malformed or invalid requests from reaching the page controller business logic.
- After successful validation, the engine constructs a context object containing:
  - The current form model and its state (user progress, answers, session data)
  - Route and request metadata (parameters, query strings, etc.)
  - Any pre-existing data relevant to the user's session or current page
- This validated context is then passed to the appropriate page controller, ensuring all downstream logic operates on consistent, validated data.

3. **Page Controller Resolution**

- The engine locates the appropriate page controller based on the validated route parameters and form definition.
- Each controller is responsible for rendering pages, processing form data, and determining navigation flow. Note that validation has already been performed by the engine at this point.

4. **Pre-Controller Event Execution (onLoad)**

- Before page controller execution, the engine checks for and executes any configured `onLoad` events.
- When an `onLoad` event of type `http` is present, the engine makes an HTTP request to the configured endpoint (see `handleHttpEvent` function).
- Event responses may update the context data before the page controller processes it.
- onLoad events execute regardless of any conditions and are used to fetch external data needed for page rendering.

5. **Controller Execution**

- The page controller's handler (GET or POST) is executed with the validated context:
  - **GET requests**: Prepare the view model and render the page template
  - **POST requests**: Process the already-validated submitted data and determine the next page or action

6. **Post-Controller Event Execution (onSave)**

- After successful page controller execution, the engine checks for and executes any configured `onSave` events.
- When an `onSave` event of type `http` is present, the engine makes an HTTP request to the configured endpoint.
- **Important**: onSave events only execute when the page controller response is successful (HTTP status codes 200-399).
- Event responses may update the context data or influence subsequent steps in the lifecycle.

7. **Response Return**

- The response from the page controller is returned to the client via Hapi's response toolkit.
- This may be:
  - A rendered HTML page (for successful GET requests)
  - A redirect response (for successful POST submissions)
  - An error response (for validation failures or system errors)

8. **Post-Response Processing (onPreResponse)**

- Before the final response is sent to the client, Hapi's `onPreResponse` extension point is triggered.
- The application uses this for error handling: if the response is a Boom error, it logs the error details and formats a structured error response.
- After this processing, the final response is sent to the client.

## Key Components

- **Routes**: Defined in `src/server/plugins/engine/plugin.ts` and related route files
- **Page Controllers**: Handle the business logic for each form page type
- **Events**: Configurable hooks (`onLoad`, `onSave`) that can trigger HTTP requests or other actions
- **Context**: Carries validated state and data throughout the request lifecycle
- **Helpers**: Utility functions for redirecting, proceeding, and normalizing paths
- **Validation**: Joi schemas for route parameters and dynamic payload validation

## Related Documentation

For more technical details, see:

- Route definitions: `src/server/plugins/engine/plugin.ts`
- Page controllers: `src/server/plugins/engine/pageControllers/`
- Event handling: `handleHttpEvent` function in `questions.ts`
- Context preparation: `src/server/plugins/engine/helpers.js`
