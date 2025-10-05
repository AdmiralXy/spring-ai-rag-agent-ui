export interface MessagePart {
  type: 'text' | 'code' | 'bold' | 'delimiter' | 'heading'
  content: string
  lang?: string
  level?: number
}

function normalizeCode(code: string): string {
  let lines = code.split('\n')
  lines = lines.map((l) => l.replace(/\r/g, '').replace(/^\uFEFF/, ''))
  while (lines.length > 0 && lines[0]?.trim() === '') lines.shift()
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') lines.pop()
  if (lines.length === 0) return ''
  const indent = Math.min(
    ...lines.filter((l) => l.trim() !== '').map((l) => l.match(/^(\s*)/)?.[0].length ?? 0)
  )
  return lines.map((l) => (l.length >= indent ? l.slice(indent) : l)).join('\n')
}

function splitBold(text: string): MessagePart[] {
  const parts: MessagePart[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const chunk = text.slice(lastIndex, match.index)
    if (chunk.trim()) {
      parts.push({ type: 'text', content: chunk })
    } else if (chunk.length > 0) {
      parts.push({ type: 'delimiter', content: '' })
    }

    const bold = match[1]
    if (bold?.trim()) {
      parts.push({ type: 'bold', content: bold })
    }
    lastIndex = match.index + match[0].length
  }

  const tail = text.slice(lastIndex)
  if (tail.trim()) {
    parts.push({ type: 'text', content: tail })
  } else if (tail.length > 0) {
    parts.push({ type: 'delimiter', content: '' })
  }

  return parts
}

function splitHeadingsAndText(text: string): MessagePart[] {
  const out: MessagePart[] = []

  const lines = text.split('\n')
  let buffer: string[] = []

  const flushBuffer = () => {
    if (buffer.length === 0) return
    const para = buffer.join('\n')
    if (para.length > 0) {
      out.push(...splitBold(para))
    }
    buffer = []
  }

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)\s*$/)
    if (m) {
      flushBuffer()
      const level = m[1]?.length
      const headingText = m[2]
      out.push({ type: 'heading', content: headingText as string, level })
      out.push({ type: 'delimiter', content: '' })
    } else {
      buffer.push(line)
    }
  }

  flushBuffer()
  return out
}

export function useMessageParts(content: string): MessagePart[] {
  const blocks: MessagePart[] = []
  const fence = /```([a-z]*)?/g
  let lastIndex = 0
  let inCode = false
  let currentLang = 'text'

  let match: RegExpExecArray | null
  while ((match = fence.exec(content)) !== null) {
    const chunkBefore = content.slice(lastIndex, match.index)

    if (chunkBefore.trim()) {
      if (inCode) {
        blocks.push({
          type: 'code',
          lang: currentLang,
          content: normalizeCode(chunkBefore)
        })
      } else {
        blocks.push(...splitHeadingsAndText(chunkBefore))
      }
    } else if (chunkBefore.length > 0) {
      blocks.push({ type: 'delimiter', content: '' })
    }

    inCode = !inCode
    if (inCode) currentLang = match[1] || 'text'

    lastIndex = fence.lastIndex
  }

  if (lastIndex < content.length) {
    const tail = content.slice(lastIndex)
    if (tail.trim()) {
      if (inCode) {
        blocks.push({
          type: 'code',
          lang: currentLang,
          content: normalizeCode(tail)
        })
      } else {
        blocks.push(...splitHeadingsAndText(tail))
      }
    } else if (tail.length > 0) {
      blocks.push({ type: 'delimiter', content: '' })
    }
  }

  return blocks
}
