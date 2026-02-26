# Configuration-based Features

Configuration-based features let you drive advanced behaviour entirely through your form definition — no custom code required. They are implemented in the JSON/YAML form definition and processed by forms-engine-plugin at runtime.

When developing with forms-engine-plugin, prefer configuration-based features over code-based ones wherever possible. They require less effort to maintain and benefit from the same testing and accessibility assurance as core forms-engine-plugin.

## [Page Events](./configuration-based/page-events)

Trigger an action on a page lifecycle event. The most common use case is calling an external API when a page loads and making the response available to downstream templates and view models.

## [Page Templates](./configuration-based/page-templates)

Add dynamic content to form pages using LiquidJS expressions. Display a user's previous answer, inject data from an API response, or compute derived values — all without writing a single line of server code.
