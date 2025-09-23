export interface MessagePart {
  type: 'text' | 'code' | 'bold' | 'delimiter'
  content: string
  lang?: string
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

export function useMessageParts(content: string): MessagePart[] {
  const blocks: MessagePart[] = []
  const regex = /```([a-z]*)?/g
  let lastIndex = 0
  let inCode = false
  let currentLang = 'text'

  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const chunkBefore = content.slice(lastIndex, match.index)

    if (chunkBefore.trim()) {
      if (inCode) {
        blocks.push({
          type: 'code',
          lang: currentLang,
          content: normalizeCode(chunkBefore)
        })
      } else {
        blocks.push(...splitBold(chunkBefore))
      }
    } else if (chunkBefore.length > 0) {
      blocks.push({ type: 'delimiter', content: '' })
    }

    inCode = !inCode
    if (inCode) currentLang = match[1] || 'text'

    lastIndex = regex.lastIndex
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
        blocks.push(...splitBold(tail))
      }
    } else if (tail.length > 0) {
      blocks.push({ type: 'delimiter', content: '' })
    }
  }

  return blocks
}
