# Multi-language support

The plugin can show a form in English and Welsh. It translates two kinds of text:

- **Plugin text**: buttons, labels, hints, error messages and other text the plugin adds to every form. The plugin includes English and Welsh translations of all of it.
- **Form text**: the titles, hints and other content that come from your form definition. You add the Welsh translations to each form definition.

A form shows Welsh only when its definition has Welsh translations. All other forms show English.

## Turn on language selection

Give the plugin a [`getLanguage`](../plugin-options.md#getlanguage) function. The plugin calls it on each request to get the language code, `en-GB` or `cy`.

This example reads the language from a `language` query parameter, then stores it in the session so that it applies to the rest of the journey:

```js
await server.register({
  plugin,
  options: {
    getLanguage(request) {
      const { query, yar } = request

      if ('language' in query) {
        yar.set('language', query.language)
      }

      return yar.get('language') ?? 'en-GB'
    }
    // ... other options
  }
})
```

Without `getLanguage`, every form shows English.

If the function returns `cy` for a form with no Welsh translations, the plugin shows that form in English.

## Add Welsh translations to a form

Put the translations in `metadata.translations.cy` in the form definition. The [forms designer](https://github.com/DEFRA/forms-designer) can edit these for you.

The plugin finds each translation by the `id` of the page, component, section or list item, so the form must use the V2 engine, where every item has an `id`:

```yaml
engine: V2
metadata:
  translations:
    cy:
      form:
        title: Gwneud cais am drwydded
      pages:
        622a35ec-3795-418a-81f3-a45746959045:
          title: Eich enw
      components:
        1fb8e182-c709-4792-8f83-e01d8b1fee1a:
          title: Beth yw eich enw cyntaf?
          shortDescription: Eich enw cyntaf
      sections:
        e3a1c6d2-52c3-4f63-9d1b-0d2b5a4c9f10:
          title: Amdanoch chi
      listItems:
        aabbccdd-1122-3344-5566-778899001126:
          text: Car
```

| Group        | Properties you can translate                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `form`       | `title`                                                                                                     |
| `pages`      | `title`, `repeatTitle`                                                                                      |
| `components` | `title`, `hint`, `content`, `shortDescription`, `errorDescription`, `paymentDescription`, `instructionText` |
| `sections`   | `title`                                                                                                     |
| `listItems`  | `text`, `hint`                                                                                              |

When a property has no Welsh translation, the plugin shows the English text from the definition, so that a partly translated form still works.

Translations can use the same `{{ }}` placeholders as the definition, for example `Pryd yw pen-blwydd {{ applicantFirstName }}?`.

## Add a language switcher to your layout

The language switcher is part of your base layout, so that it matches the rest of your service. On question pages the plugin gives your layout:

| Property                      | Description                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `context.languages`           | The languages the form is available in, as `{ name, code }` objects. Empty when the form is English only |
| `context.translator.language` | The language code of the current page                                                                    |

Use the `applyUrlParam` filter to build a link to the same page with the `language` query parameter that your `getLanguage` function reads. In this example, `currentPath` is the request path and query string, which your [`viewContext`](../plugin-options.md#viewcontext) provides:

```njk
{% if context.languages | length %}
  <ul class="govuk-list app-language-switcher">
    {% for lang in context.languages %}
      <li>
        {% if lang.code == context.translator.language %}
          <span aria-current="true">{{ lang.name }}</span>
        {% else %}
          <a class="govuk-link" href="{{ currentPath | applyUrlParam('language', lang.code) }}" lang="{{ lang.code }}">{{ lang.name }}</a>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
{% endif %}
```

Also set `htmlLang`, which the GOV.UK Frontend page template uses for the `lang` attribute, so that screen readers use the right pronunciation:

```njk
{% set htmlLang = context.translator.language if context.translator else 'en-GB' %}
```

## Translate text in your own templates

Page view models include a `t` function for the language of the current request. Use it in your layout and custom templates to show plugin text:

```njk
{{ t('common.continue') }}
```

The keys are in the plugin's translation files: `src/server/plugins/engine/i18n/translations/en-GB.json` and `cy.json`.

`t` resolves only these plugin keys. Text that your service owns, such as your header and footer, needs your own translations.

On routes that your application owns, outside the plugin's pages, the global `t` always returns English.

## Translate text in custom page controllers

A custom page controller needs a translator only when your service offers Welsh. Page controller methods such as `getViewModel` use the language of the current request when you do not pass a translator.

In a page controller, `context.translator` is the translator for the current request. Use `tComponent(this.def, 'title')`, `tListItem(item, 'text')` and the other helpers to show form content in the user's language. `translator.t` resolves only the plugin's own keys. To build component view models in the user's language, pass the translator in the `RenderContext`:

```ts
const components = this.collection.getViewModel({
  payload,
  errors,
  translator: context.translator
})
```

See [Custom page controllers](./code-based/page-controllers).

## Submissions

The language the user saw is in the `language` field of the submission message metadata, so that your downstream services can reply in the same language.

Payment descriptions are sent to GOV.UK Pay in the user's language. The submission message also includes the English description in `descriptionInEng`.
