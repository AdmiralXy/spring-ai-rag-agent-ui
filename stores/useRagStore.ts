import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

export const useRagStore = defineStore('rag', {
  state: () => ({
    documents: {} as Record<string, RagDocument[]>,
    loading: false
  }),

  getters: {
    getDocsBySpace: (state) => {
      return (spaceId: string) => state.documents[spaceId] ?? []
    }
  },

  actions: {
    /** Get documents for space */
    async fetchDocuments(spaceId: string, limit = 20) {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.get<GetDocumentsRs>(`/rag/${spaceId}/documents`, {
          query: { limit }
        })
        this.documents[spaceId] = res.documents
      } finally {
        this.loading = false
      }
    },

    /** Add document to space using server-sent events for progress */
    async addDocumentStream(
      spaceId: string,
      payload: AddToSpaceRq,
      onProgress: (p: number) => void
    ) {
      const config = useRuntimeConfig()
      const baseURL = import.meta.server
        ? (config.apiBase as string)
        : (config.public.apiBase as string)

      const res = await fetch(`${baseURL}/rag/${spaceId}/documents/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data:')) {
            const raw = line.slice(5).trim()
            if (raw && raw !== '[DONE]') {
              const num = Number(raw.replace('%', ''))
              if (!isNaN(num)) {
                onProgress(num)
              }
            }
          }
        }
      }
    },

    /** Delete document with all chunks from space */
    async deleteDocument(spaceId: string, docId: string) {
      this.loading = true
      try {
        const api = useApi()
        await api.del(`/rag/${spaceId}/documents/${docId}`)

        this.documents[spaceId] = (this.documents[spaceId] ?? []).filter(
          (d) => d.metadata.doc !== docId
        )
      } finally {
        this.loading = false
      }
    },

    /** Delete document chunk from space */
    async deleteDocumentChunk(spaceId: string, docId: string, chunkId: string) {
      this.loading = true
      try {
        const api = useApi()
        await api.del(`/rag/${spaceId}/documents/${docId}/chunks/${chunkId}`)

        this.documents[spaceId] = (this.documents[spaceId] ?? []).filter(
          (d) => d.metadata.chunk !== chunkId
        )
      } finally {
        this.loading = false
      }
    }
  }
})
