export default /** @type {FormDefinition} */ ({
  startPage: '/page1',
  pages: [
    {
      path: '/page1',
      components: [
        {
          type: 'DeclarationField',
          title: 'Declaration title',
          name: 'declarationField',
          shortDescription: 'Declaration',
          content:
            '# H1\r\n## H2\r\n### H3\r\n#### h4\r\n##### h5\r\n###### h6\r\n####### h7',
          options: {
            required: true
          },
          schema: {},
          id: '3a71d9e2-ecab-4d43-8357-23fafbe8eb25'
        }
      ],
      next: [
        {
          path: '/summary'
        }
      ],
      title: 'Some guidance'
    },
    {
      path: '/summary',
      controller: 'SummaryPageController',
      title: 'Summary',
      components: []
    }
  ],
  lists: [],
  sections: [],
  phaseBanner: {},
  conditions: []
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
