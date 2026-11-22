export interface SseEvent {
  event: string
  data: string
}

/**
 * Reads a `text/event-stream` response body and yields parsed events.
 * Multi-line `data:` fields are joined with `\n` as the SSE spec requires.
 */
export async function* readSseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const parse = (block: string): SseEvent | null => {
    let event = 'message'
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue
      const colon = line.indexOf(':')
      const field = colon === -1 ? line : line.slice(0, colon)
      let value = colon === -1 ? '' : line.slice(colon + 1)
      if (value.startsWith(' ')) value = value.slice(1)
      if (field === 'event') event = value
      else if (field === 'data') data.push(value)
    }
    return data.length ? { event, data: data.join('\n') } : null
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n')

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const parsed = parse(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (parsed) yield parsed
        boundary = buffer.indexOf('\n\n')
      }
    }
    const tail = parse(buffer.trim())
    if (tail) yield tail
  } finally {
    reader.releaseLock()
  }
}
