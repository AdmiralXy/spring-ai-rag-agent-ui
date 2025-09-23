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

    /** Add document to space */
    async addDocument(spaceId: string, payload: AddToSpaceRq) {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.post<AddToSpaceRs>(`/rag/${spaceId}/documents`, payload)

        const doc: RagDocument = {
          id: res.docId,
          content: payload.text,
          metadata: {}
        }

        if (!this.documents[spaceId]) {
          this.documents[spaceId] = []
        }

        this.documents[spaceId].unshift(doc)
        return doc
      } finally {
        this.loading = false
      }
    },

    /** Delete document from space */
    async deleteDocument(spaceId: string, docId: string) {
      this.loading = true
      try {
        const api = useApi()
        await api.del(`/rag/${spaceId}/documents/${docId}`)

        this.documents[spaceId] = (this.documents[spaceId] ?? []).filter((d) => d.id !== docId)
      } finally {
        this.loading = false
      }
    }
  }
})
