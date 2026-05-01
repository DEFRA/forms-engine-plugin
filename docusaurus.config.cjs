// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Forms Engine Plugin',
  tagline: 'A hapi plugin for building GOV.UK form journeys with minimal code',
  favicon: undefined,

  url: 'https://defra.github.io',
  baseUrl: '/forms-engine-plugin/',

  organizationName: 'defra',
  projectName: 'forms-engine-plugin',
  deploymentBranch: 'main',
  trailingSlash: false,

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  presets: [],

  themes: [
    /** @type {any} */ ([
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        docsRouteBasePath: '/',
        indexBlog: false,
        indexPages: false,
        hashed: 'filename',
        highlightSearchTermsOnTargetPage: true,
        searchResultContextMaxLength: 60
      }
    ]),
    '@defra/docusaurus-theme-govuk'
  ],

  plugins: [
    function customCssPlugin() {
      return {
        name: 'custom-css',
        getClientModules() {
          return [require.resolve('./docs/assets/css/docusaurus.css')]
        }
      }
    },
    [
      '@docusaurus/plugin-content-docs',
      {
        routeBasePath: '/',
        editUrl: 'https://github.com/DEFRA/forms-engine-plugin/tree/main/'
      }
    ]
  ],

  themeConfig: {
    // Required by @docusaurus/plugin-content-docs when not using preset-classic.
    // easyops SearchBarWrapper calls useThemeConfig().docs.versionPersistence
    // during SSR; without this it throws "Cannot read properties of undefined".
    docs: {
      versionPersistence: 'localStorage'
    },
    govuk: {
      header: {
        serviceName: 'Forms Engine Plugin',
        serviceHref: '/',
        organisationText: 'Defra DDTS',
        organisationHref: 'https://github.com/defra'
      },

      navigation: [
        { text: 'Getting Started', href: '/getting-started', sidebar: 'auto' },
        {
          text: 'Features',
          href: '/features',
          sidebar: [
            { text: 'Overview', href: '/features' },
            { text: 'Components', href: '/features/components' },
            { text: 'Page Types', href: '/features/pages' },
            {
              text: 'Advanced',
              href: '/features',
              items: [
                {
                  text: 'Configuration-based',
                  href: '/features/configuration-based'
                },
                {
                  text: 'Code-based',
                  href: '/features/code-based'
                }
              ]
            }
          ]
        },
        { text: 'Plugin Options', href: '/plugin-options', sidebar: 'auto' },
        { text: 'Schema', href: '/schemas', sidebar: 'auto' },
        {
          text: 'Reference',
          href: '/request-lifecycle',
          sidebar: [
            { text: 'Request Lifecycle', href: '/request-lifecycle' },
            {
              text: 'Form Definition Formats',
              href: '/form-definition-formats'
            }
          ]
        }
      ],

      phaseBanner: {
        phase: 'beta',
        text: 'This is a new capability. Help us improve it and give your feedback on Slack.'
      },

      footer: {
        meta: [
          {
            text: 'GitHub',
            href: 'https://github.com/DEFRA/forms-engine-plugin'
          },
          {
            text: 'Contributing',
            href: '/forms-engine-plugin/contributing'
          }
        ]
      },

      homepage: {
        getStartedHref: '/getting-started',
        description:
          'Configuration-driven and extensible, built on Hapi.js. Handles routing, validation, state management, and GOV.UK Frontend rendering — so teams can focus on form design, not plumbing.'
      }
    }
  }
}

module.exports = config
