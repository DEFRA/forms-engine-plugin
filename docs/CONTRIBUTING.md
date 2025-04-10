# Contributing to DXT

> **Note:** This guide is for developers within the Department for Environment, Food & Rural Affairs. We do not guarantee support for those outside of this organisation.

Thank you for considering making a contribution to DXT! Our goal is to make DXT a community-driven effort, collaboratively supporting the needs of the many teams within the Defra Group.

This guide aims to set clear expectations for everyone involved in our project, to make collaborating a smooth and enjoyable experience.

## I have a question

If you are within Department for Environment, Food & Rural Affairs, please primarily direct your questions to our Slack channel [#defra-forms-support](https://defra-digital-team.slack.com). Our team monitors this channel during working hours and will provide assistance.

## I want to request something

### Reporting bugs

Report bugs on the [#defra-forms-support](https://defra-digital-team.slack.com) slack channel. If you are not a member of Defra, [submit a GitHub issue](https://github.com/DEFRA/forms-engine-plugin/issues).

Ensure you are experiencing it with the latest version of `@defra/forms-engine-plugin` or the production version of our service `https://forms-designer.prod.cdp-int.defra.cloud/`. Support for older versions is not currently provided.

If your bug is with the plugin, ensure you are running the plugin in a supported environment: see `package.json` to validate the compatible Node runtime and `README.md` to validate runtime dependencies.

**What we need from you:**

- A short and clear description of the issue. Explain the current behaviour along with the expected behaviour.
- A step-by-step guide that details how we can reproduce your issue
- A text copy (not a screenshot) of any error messages and stack traces
- The version of your runtime (e.g. Node 22.11.0)
- If the issue is with a form, a copy of the form definition (JSON) file

**What we will provide:**

- An acknowledgement of your issue
- A Azure DevOps ticket number, where any remediation work will be tracked
- An estimated timeframe for a resolution
- An update once the issue is resolved

### Suggesting features

Feature suggestions are welcomed from teams within Defra Group only. Our roadmap is continually updated as new requirements emerge. Suggest new features on our [#defra-forms-support](https://defra-digital-team.slack.com) slack channel.

## I want to contribute something

All code contributed to this repository should meet the [Defra software development standards](https://defra.github.io/software-development-standards/). Our codebase, by exception, allows modification of Typescript files where appropriate. However, new code that is contributed should be Javascript with types via JSDoc, not Typescript.

Our specific coding standards are primarily enforced by our GitHub workflows. These workflows will verify using tsc, ESLint, Prettier, EditorConfig and Stylelint. See the `lint` job within [.github/workflows/check-pull-request.yml](https://github.com/DEFRA/forms-engine-plugin/blob/main/.github/workflows/check-pull-request.yml) for more details.

Our GitHub Workflows will mark each pull request with a pass/fail based on tests, linting, type checking and analysis by SonarQube. **Pull requests that fail these checks will not be accepted.**

Draft pull requests are accepted if you are not yet finished, but would like early feedback. Pull requests that remain as a draft for over 30 days will be closed.

### Fixing bugs

If you would like to fix the bug yourself, contributions are accepted through pull requests.

### Adding features

Features should be discussed with the Defra Forms team prior to implementation. This is to prevent wasted effort if the Defra Forms team decides not to accept it, or if we suggest any significant amendments. Reach out to us on [#defra-forms-support](https://defra-digital-team.slack.com) to discuss your requirements. If accepted by the product owner, we welcome a pull request.
