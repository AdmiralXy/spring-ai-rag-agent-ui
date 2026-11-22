import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'
import { authHeaders, signOutLocally } from '~/composables/useAuthToken'
import { readSseEvents } from '~/utils/sse'

/** Adding content to a space failed; `partial` tells that some chunks were stored before the error. */
export class SpaceUploadError extends Error {
  constructor(
    message: string,
    readonly partial = false
  ) {
    super(message)
    this.name = 'SpaceUploadError'
  }
}

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

    /**
     * Adds content to a space; the backend streams the progress in percent. A failure arrives as an
     * `error` event with a readable message and is thrown as a SpaceUploadError.
     */
    async addDocumentStream(
      spaceId: string,
      payload: AddToSpaceRq,
      onProgress: (p: number) => void
    ) {
      const config = useRuntimeConfig()
      const baseURL = import.meta.server
        ? (config.apiBase as string)
        : (config.public.apiBase as string)

      let res: Response
      try {
        res = await fetch(`${baseURL}/rag/${spaceId}/documents/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...authHeaders()
          },
          body: JSON.stringify(payload)
        })
      } catch {
        throw new SpaceUploadError('The server cannot be reached, check your connection')
      }

      if (res.status === 401) {
        signOutLocally(window.location.pathname)
        throw new SpaceUploadError('Your session has expired, sign in again')
      }
      if (!res.ok || !res.body) {
        let message = `Adding the content failed (${res.status})`
        try {
          const body = await res.json()
          message = body?.detail || body?.message || message
        } catch {
          // not JSON
        }
        throw new SpaceUploadError(message)
      }

      let completed = false
      let started = false
      try {
        for await (const { event, data } of readSseEvents(res.body)) {
          if (event === 'error') {
            let message = 'Adding the content failed'
            let partial = started
            try {
              const json = JSON.parse(data)
              message = json.message || message
              partial = Boolean(json.partial)
            } catch {
              message = data || message
            }
            throw new SpaceUploadError(message, partial)
          }
          const percent = Number(data.replace('%', '').trim())
          if (!Number.isNaN(percent)) {
            started = true
            completed = percent >= 100
            onProgress(percent)
          }
        }
      } catch (err) {
        if (err instanceof SpaceUploadError) throw err
        throw new SpaceUploadError(
          'The connection was interrupted while adding the content',
          started
        )
      }
      if (!completed) {
        throw new SpaceUploadError(
          'The server stopped before the content was fully added, try again',
          started
        )
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
