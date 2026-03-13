import { Marked, type Token } from 'marked'

export const markdown = new Marked({
  breaks: true,
  gfm: true,

  /**
   * Render paragraphs without `<p>` wrappers
   * for check answers summary list `<dd>`
   */
  extensions: [
    {
      name: 'paragraph',
      renderer({ tokens = [] }) {
        const text = this.parser.parseInline(tokens)
        return tokens.length > 1 ? `${text}<br>` : text
      }
    }
  ],

  /**
   * Restrict allowed Markdown tokens
   */
  walkTokens(token) {
    const tokens: Token['type'][] = [
      'br',
      'escape',
      'link',
      'list',
      'list_item',
      'paragraph',
      'space',
      'text'
    ]

    if (!tokens.includes(token.type)) {
      token.type = 'text'
    }
  }
})
