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
            {
              text: 'Components',
              href: '/features/components',
              items: [
                { text: 'Overview', href: '/features/components' },
                { text: 'Text Field', href: '/features/components/text-field' },
                {
                  text: 'Multiline Text Field',
                  href: '/features/components/multiline-text-field'
                },
                {
                  text: 'Number Field',
                  href: '/features/components/number-field'
                },
                {
                  text: 'Email Address Field',
                  href: '/features/components/email-address-field'
                },
                {
                  text: 'Telephone Number Field',
                  href: '/features/components/telephone-number-field'
                },
                {
                  text: 'Date Parts Field',
                  href: '/features/components/date-parts-field'
                },
                {
                  text: 'Month Year Field',
                  href: '/features/components/month-year-field'
                },
                {
                  text: 'Yes No Field',
                  href: '/features/components/yes-no-field'
                },
                {
                  text: 'Radios Field',
                  href: '/features/components/radios-field'
                },
                {
                  text: 'Checkboxes Field',
                  href: '/features/components/checkboxes-field'
                },
                {
                  text: 'Select Field',
                  href: '/features/components/select-field'
                },
                {
                  text: 'Autocomplete Field',
                  href: '/features/components/autocomplete-field'
                },
                {
                  text: 'UK Address Field',
                  href: '/features/components/uk-address-field'
                },
                {
                  text: 'File Upload Field',
                  href: '/features/components/file-upload-field'
                },
                {
                  text: 'Declaration Field',
                  href: '/features/components/declaration-field'
                },
                {
                  text: 'Hidden Field',
                  href: '/features/components/hidden-field'
                },
                {
                  text: 'Payment Field',
                  href: '/features/components/payment-field'
                },
                { text: 'HTML', href: '/features/components/html' },
                { text: 'Markdown', href: '/features/components/markdown' },
                { text: 'Inset Text', href: '/features/components/inset-text' },
                { text: 'Details', href: '/features/components/details' },
                { text: 'List', href: '/features/components/list' },
                {
                  text: 'Easting Northing Field',
                  href: '/features/components/easting-northing-field'
                },
                {
                  text: 'OS Grid Ref Field',
                  href: '/features/components/os-grid-ref-field'
                },
                {
                  text: 'National Grid Field Number Field',
                  href: '/features/components/national-grid-field-number-field'
                },
                {
                  text: 'Lat Long Field',
                  href: '/features/components/lat-long-field'
                },
                {
                  text: 'Geospatial Field',
                  href: '/features/components/geospatial-field'
                }
              ]
            },
            {
              text: 'Page Types',
              href: '/features/pages',
              items: [
                { text: 'Overview', href: '/features/pages' },
                {
                  text: 'Question Page',
                  href: '/features/pages/question-page'
                },
                { text: 'Start Page', href: '/features/pages/start-page' },
                {
                  text: 'Terminal Page',
                  href: '/features/pages/terminal-page'
                },
                { text: 'Repeat Page', href: '/features/pages/repeat-page' },
                {
                  text: 'File Upload Page',
                  href: '/features/pages/file-upload-page'
                },
                { text: 'Summary Page', href: '/features/pages/summary-page' },
                {
                  text: 'Summary Page with Confirmation Email',
                  href: '/features/pages/summary-page-with-confirmation-email'
                },
                { text: 'Status Page', href: '/features/pages/status-page' }
              ]
            },
            {
              text: 'Configuration-based (Advanced)',
              href: '/features/configuration-based',
              items: [
                {
                  text: 'Page Events',
                  href: '/features/configuration-based/page-events'
                },
                {
                  text: 'Page Templates',
                  href: '/features/configuration-based/page-templates'
                }
              ]
            },
            {
              text: 'Code-based (Advanced)',
              href: '/features/code-based',
              items: [
                { text: 'Components', href: '/features/code-based/components' },
                {
                  text: 'Custom Services',
                  href: '/features/code-based/custom-services'
                },
                {
                  text: 'File Upload',
                  href: '/features/code-based/file-upload'
                },
                { text: 'Page Views', href: '/features/code-based/page-views' },
                {
                  text: 'Pre-populate State',
                  href: '/features/code-based/pre-populate-state'
                },
                {
                  text: 'Save and Exit',
                  href: '/features/code-based/save-and-exit'
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
