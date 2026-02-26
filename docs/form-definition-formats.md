# Form definition formats

Form definitions are retrieved by `forms-engine-plugin` using the `formsService` plugin registration option. The relevant function is `getFormDefinition()`, which must return a JavaScript object that matches the schema of a form definition.

You can choose:

- To load your form definitions from an external source (e.g. an API you control, a database, etc) by building a custom `formsService`
- To use an out-of-the-box `formsService` called a 'loader' that loads forms from disk - this is an abstraction on top of the service interface

## File-based form loading

For convenience, the engine provides a pre-defined service that supports loading forms from disk using YAML (preferred for multi-line content) or JSON formats. YAML is recommended for developers as it natively supports line breaks in content blocks, making it ideal for forms with HTML content:

```yaml
# example-form.yaml
name: "Form name"
pages:
  - title: "Page title"
    components:
      - type: "Html"
        content: |
          <h1 class="govuk-heading-l">
            govuk-heading-l
          </h1>

          <p class="govuk-body">
            govuk-body
          </p>
```

```jsonc
# example-form.json
{
  "name": "Form name",
  "pages": [
    {
      "title": "Page title",
      "components": [
        {
          "type": "Html",
          "hint": "<h1 class=\"govuk-heading-l\">govuk-heading-l</h1><p class=\"govuk-body\">govuk-body</p>"
        }
      ]
    }
  ]
}
```

See the [Custom Services guide](features/code-based/CUSTOM_SERVICES.md) for complete documentation on using the `FileFormService` class with the loader pattern, or for implementing custom `formsService` solutions for more complex requirements.
