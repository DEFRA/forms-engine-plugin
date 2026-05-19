# Code-based Features

Code-based features let you extend forms-engine-plugin with custom TypeScript or JavaScript. Use them when configuration-based options aren't sufficient for your requirements — for example, to build a bespoke component, override a service, or add highly specialised page logic.

> Only introduce code-based customisations where there is genuine business need. Custom code becomes your team's responsibility to test, maintain and keep accessible.

## [Custom Components](./code-based/components)

Build custom form components. Components can extend `ComponentBase` for display-only purposes or `FormComponent` to handle user input with validation, state management and rendering.

## [Custom Page Controllers](./code-based/page-controllers)

Attach bespoke server-side logic to a specific page. For example: running an auth check before render, enriching the view model with external data, or intercepting form submission.

## [Custom Services](./code-based/custom-services)

Replace the default form-loading or submission behaviour by providing your own `formsService`, `formSubmissionService` or `outputService` implementations via the plugin registration options.

## [File Upload](./code-based/file-upload)

Integrate CDP's `cdp-uploader` service to support accessible, progressively-enhanced file submissions within a form journey.

## [Page Views](./code-based/page-views)

Override the default Nunjucks templates for individual pages by configuring Vision to look in your own views directory before falling back to forms-engine-plugin's built-in templates.

## [Pre-populate State](./code-based/pre-populate-state)

Automatically copy query string parameter values into hidden fields on first load, allowing values to flow through a journey and on to submission without user interaction.

## [Save and Exit](./code-based/save-and-exit)

Show a secondary "Save and exit" button on question pages and handle the persisted session using a route handler you supply, enabling users to leave and resume their journey later.

## [Template Extensions](./code-based/template-extensions)

Add custom globals and filters to the Nunjucks template environment, making them available across all form page templates and LiquidJS page templates.

## [Form Definition Formats](./code-based/form-definition-formats)

Options for loading form definitions — file-based loading with the built-in `FileFormService`, or a custom `formsService` implementation for API and database sources.

## [Session Cache](./code-based/session-cache)

Configuring the server-side session store for production: named catbox cache or a custom `CacheService` subclass.
