# @defra/forms-engine-plugin

The `@defra/forms-engine-plugin` is a [plugin](https://hapi.dev/tutorials/plugins/?lang=en_US) for [hapi](https://hapi.dev/) used to serve GOV.UK-based form journeys.

It is designed to be embedded in the frontend of a digital service and provide a convenient, configuration driven approach to building forms that are aligned to [GDS Design System](https://design-system.service.gov.uk/) guidelines.

## Table of Contents

- [Demo of DXT](#demo-of-dxt)
- [Installation](#installation)
- [Documentation](#documentation)
- [Publishing the Package](#publishing-the-package)
  - [Semantic Versioning Control](#semantic-versioning-control)
  - [Major-Version Release Branches](#major-version-release-branches)
  - [Manual Workflow Triggers](#manual-workflow-triggers)
  - [Workflow Triggers](#workflow-triggers)
  - [Safety and Consistency](#safety-and-consistency)

## Demo of DXT

TODO: Link to CDP exemplar

## Installation

[See our getting started developer guide](./docs/GETTING_STARTED.md).

## Documentation

DXT has a mix of configuration-driven and code-based features that developers can utilise.

[See our documentation folder](./docs/INDEX.md) to learn more about the features of DXT.

## Contributing

[See our contribution guide](./docs/CONTRIBUTING.md).

## Publishing the package

Our GitHub Actions workflow (`publish.yml`) is set up to make publishing a breeze, using semantic versioning and a variety of release strategies. Here's how you can make the most of it:

### Semantic Versioning Control

- **Patch Versioning**: This happens automatically whenever you merge code changes into `main` or any release branch.
- **Minor and Major Bumps**: You can control these by making empty commits with specific hashtags:
  - Use `#minor` for a minor version bump.
  - Use `#major` for a major version bump.

**Example Commands**:

```bash
git commit --allow-empty -m "chore(release): #minor" # Minor bump
git commit --allow-empty -m "chore(release): #major" # Major bump
```

### Major-Version Release Branches

- **Branch Naming**: Stick to `release/vX` (like `release/v1`, `release/v2`).
- **Independent Versioning**: Each branch has its own versioning and publishes to npm with a unique dist-tag (like `2x` for `release/v2`).

### Manual Workflow Triggers

- **Customizable Options**: You can choose the type of version bump, specify custom npm tags, and use dry run mode for testing. Dry-run is enabled by default.
- **Special Releases**: Perfect for beta releases or when you need to publish outside the usual process.

### Workflow Triggers

1. **Standard Development Flow**: Merging PRs to `main` automatically triggers a patch bump and publishes with the `beta` tag.
2. **Backporting**: Cherry-pick fixes to release branches for patch bumps with specific tags (like `2x`).
3. **Version Bumps**: Use empty commits for minor or major bumps.
4. **Manual Releases**: Trigger these manually for special cases like beta or release candidates.

### Safety and Consistency

- **Build Process**: Every publishing scenario includes a full build to ensure everything is in top shape, except for files like tests and lint rules.
- **Tagging Safety**: We prevent overwriting the `beta` tag by enforcing custom tags for non-standard branches. The default is set to `beta`. For release branches, the tag will be picked up from the release branch itself.
