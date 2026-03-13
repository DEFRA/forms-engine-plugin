import { Marked, type Token, type Tokens } from 'marked'

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
    },

    /**
     * Consume {:target="_blank"} attribute syntax after links
     * so it is not rendered as plain text.
     * The actual new-tab behaviour is handled by the model's
     * markdownToHtml renderer — this extension only strips the
     * syntax from the output.
     */
    {
      name: 'linkAttributes',
      level: 'inline',
      start(src: string) {
        return src.indexOf('{:')
      },
      tokenizer(src: string, tokens: Token[]) {
        const match = /^\{:target=&quot;_blank&quot;\}/.exec(src)
        if (match && tokens.length > 0) {
          const last = tokens[tokens.length - 1]
          if (last.type === 'link') {
            ;(last as Tokens.Link & { forceNewTab: boolean }).forceNewTab = true
            return {
              type: 'linkAttributes',
              raw: match[0]
            }
          }
        }
      },
      renderer() {
        return ''
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
      'linkAttributes',
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
