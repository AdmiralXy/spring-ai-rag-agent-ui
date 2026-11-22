import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'

const COPY_ICON =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>'

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false
})

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]!
  const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  const code = token.content.replace(/\n$/, '')

  let highlighted: string
  if (lang && hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
  } else {
    highlighted = md.utils.escapeHtml(code)
  }

  const label = md.utils.escapeHtml(lang || 'text')
  return (
    `<div class="md-code"><div class="md-code__head"><span>${label}</span>` +
    `<button type="button" class="md-code__copy" data-copy>${COPY_ICON}<span>Copy</span></button></div>` +
    `<pre><code class="hljs">${highlighted}</code></pre></div>`
  )
}

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]!.attrSet('target', '_blank')
  tokens[idx]!.attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/** Renders assistant Markdown to safe HTML (raw HTML in the source is escaped). */
export function renderMarkdown(source: string): string {
  return md.render(source ?? '')
}
