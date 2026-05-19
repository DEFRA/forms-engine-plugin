# Template extensions

The `globals` and `filters` plugin options let you extend the Nunjucks template environment with custom functions and filters. Both are available across all form page templates and in [page templates](../configuration-based/page-templates) (LiquidJS).

## Globals

Globals are functions you call directly in templates, without needing an input value. Register them via the `globals` plugin option:

```js
await server.register({
  plugin,
  options: {
    globals: {
      getCurrentYear: () => new Date().getFullYear(),
      formatCurrency: (amount) =>
        new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP'
        }).format(amount)
    }
  }
})
```

Use them in any Nunjucks template:

```njk
<p>Copyright {{ getCurrentYear() }}</p>
<p>Total: {{ formatCurrency(123.45) }}</p>
```

## Filters

Filters transform a value passed on the left side of the `|` operator. Register them via the `filters` plugin option:

```js
const formatter = new Intl.NumberFormat('en-GB')

await server.register({
  plugin,
  options: {
    filters: {
      money: (value) => formatter.format(value),
      upper: (value) => (typeof value === 'string' ? value.toUpperCase() : value)
    }
  }
})
```

Use them in any Nunjucks template, or in [LiquidJS page templates](../configuration-based/page-templates):

```njk
<p>{{ amount | money }}</p>
<p>{{ name | upper }}</p>
```

## Built-in filters

forms-engine-plugin registers several filters automatically. These are available in all templates without any configuration:

| Filter     | Description                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| `markdown` | Renders a Markdown string to HTML                                              |
| `answer`   | Returns the user's answer for a given component name (LiquidJS only)           |
| `page`     | Returns the page definition for a given path (LiquidJS only)                   |
| `field`    | Returns the component definition for a given name (LiquidJS only)              |
| `href`     | Returns the full page href for a given path (LiquidJS only)                    |
| `evaluate` | Evaluates a nested LiquidJS template using the current context (LiquidJS only) |

The LiquidJS-only filters are documented in full in [Page templates](../configuration-based/page-templates#built-in-filters).
