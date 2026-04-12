import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

const DEFAULT_DOCUMENT_LIMIT = 20

export const useRagStore = defineStore('rag', {
  state: () => ({
    documents: {} as Record<string, RagDocument[]>,
    loading: false,
    documentsLoading: {} as Record<string, boolean>,
    documentsLoadingMore: {} as Record<string, boolean>,
    documentLimits: {} as Record<string, number>,
    documentsHasMore: {} as Record<string, boolean>,
    searchLoading: {} as Record<string, boolean>
  }),

  getters: {
    getDocsBySpace: (state) => {
      return (spaceId: string) => state.documents[spaceId] ?? []
    },
    isDocumentsLoading: (state) => {
      return (spaceId: string) => Boolean(state.documentsLoading[spaceId])
    },
    isDocumentsLoadingMore: (state) => {
      return (spaceId: string) => Boolean(state.documentsLoadingMore[spaceId])
    },
    hasMoreDocuments: (state) => {
      return (spaceId: string) => state.documentsHasMore[spaceId] ?? true
    },
    getDocumentLimit: (state) => {
      return (spaceId: string) => state.documentLimits[spaceId] ?? DEFAULT_DOCUMENT_LIMIT
    },
    isSearchLoading: (state) => {
      return (spaceId: string) => Boolean(state.searchLoading[spaceId])
    }
  },

  actions: {
    /** Get documents for space */
    async fetchDocuments(spaceId: string, limit = 20) {
      const currentDocs = this.documents[spaceId] ?? []
      const previousCount = currentDocs.length
      const previousLimit = this.documentLimits[spaceId] ?? 0
      const isLoadingMore = previousCount > 0 && limit > previousLimit

      if (isLoadingMore) {
        this.documentsLoadingMore[spaceId] = true
      } else {
        this.documentsLoading[spaceId] = true
      }

      try {
        const api = useApi()
        const res = await api.get<GetDocumentsRs>(`/rag/${spaceId}/documents`, {
          query: { limit }
        })

        this.documents[spaceId] = res.documents
        this.documentLimits[spaceId] = limit

        if (res.documents.length < limit) {
          this.documentsHasMore[spaceId] = false
        } else if (isLoadingMore) {
          this.documentsHasMore[spaceId] = res.documents.length > previousCount
        } else {
          this.documentsHasMore[spaceId] = res.documents.length >= limit
        }
      } finally {
        if (isLoadingMore) {
          this.documentsLoadingMore[spaceId] = false
        } else {
          this.documentsLoading[spaceId] = false
        }
      }
    },

    async initializeDocuments(spaceId: string, limit = DEFAULT_DOCUMENT_LIMIT) {
      return this.fetchDocuments(spaceId, limit)
    },

    async refreshDocuments(spaceId: string) {
      return this.fetchDocuments(spaceId, this.getDocumentLimit(spaceId))
    },

    async loadMoreDocuments(spaceId: string, step = DEFAULT_DOCUMENT_LIMIT) {
      if (this.isDocumentsLoading(spaceId) || this.isDocumentsLoadingMore(spaceId)) return
      if (!this.hasMoreDocuments(spaceId)) return

      const nextLimit = this.getDocumentLimit(spaceId) + step
      return this.fetchDocuments(spaceId, nextLimit)
    },

    async searchDocuments(spaceId: string, q: string, k = 5) {
      this.searchLoading[spaceId] = true
      try {
        const api = useApi()
        const res = await api.get<GetDocumentsRs>(`/rag/${spaceId}/search`, {
          query: { q, k }
        })
        return res.documents
      } finally {
        this.searchLoading[spaceId] = false
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

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Upload failed')
      }

      if (!res.body) {
        throw new Error('Upload failed')
      }

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
