# Features

forms-engine-plugin provides built-in components and page types you can use immediately in your form definitions, as well as extension points for driving dynamic behaviour or writing custom code.

## [Components](./features/components)

A library of built-in form components — text fields, date inputs, radio buttons, file upload, payment, geospatial fields, and more. Add them to your form definition by name.

## [Page Types](./features/pages)

Built-in page controllers that define how a page behaves — question pages, repeating groups, file upload pages, summary and confirmation pages.

## [Conditions](./features/conditions)

Make pages conditional — skip them based on the user's previous answers. Conditions support comparisons across all answer types and can be composed into nested logic groups.

## [Page Elements](./features/page-elements)

View model properties the plugin provides to your base layout template — back link, phase banner, page title, errors, and feedback link. Required reading when building or customising the base Nunjucks layout.

## [Form Definition Options](./features/form-definition-options)

Top-level form definition fields that control global behaviour: sections, lists, reference number display, user feedback, phase banner label, and declaration text on the summary page.

## Extending the plugin

### [Configuration-based Features](./features/configuration-based)

Drive advanced functionality — such as calling APIs and rendering dynamic content — entirely through form definitions, with no custom code required.

### [Code-based Features](./features/code-based)

Implement highly tailored behaviour by writing custom TypeScript/JavaScript that integrates with forms-engine-plugin's extension points.
