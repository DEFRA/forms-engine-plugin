# Templates and views

## Extending the default layout

TODO

To override the default page template, vision and nunjucks both need to be configured to search in the `forms-engine-plugin` views directory when looking for template files.

For vision this is done through the `path` [plugin option](https://github.com/hapijs/vision/blob/master/API.md#options)
For nunjucks it is configured through the environment [configure options](https://mozilla.github.io/nunjucks/api.html#configure).

The `forms-engine-plugin` path to add can be imported from:

`import { VIEW_PATH } from '@defra/forms-engine-plugin'`

Which can then be appended to the `node_modules` path `node_modules/@defra/forms-engine`.

The main template layout is `govuk-frontend`'s `template.njk` file, this also needs to be added to the `path`s that nunjucks can look in.
