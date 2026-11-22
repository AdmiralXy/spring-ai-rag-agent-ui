import { defineStore } from 'pinia'
import { errorMessage, errorStatus, useApi } from '~/composables/useApi'
import useNotification from '~/composables/useNotification'
import { useModelsStore } from '~/stores/useModelsStore'
import { NotificationType } from '~/types/notification'

const defaultEmbeddings: EmbeddingsModelSettings = {
  provider: 'OPENAI',
  baseUrl: '',
  apiKey: '',
  name: '',
  dimensions: 1536,
  maxDocumentTokens: 7000,
  indexedChunks: 0
}

const defaultSummarizer: SummarizerModelSettings = {
  provider: 'OPENAI',
  name: '',
  baseUrl: '',
  apiKey: '',
  systemPrompt: ''
}

export type SaveEmbeddingsResult = 'saved' | 'needs-confirmation' | 'failed'

export const useModelSettingsStore = defineStore('model-settings', {
  state: () => ({
    chatModels: [] as ChatModelSettings[],
    embeddings: { ...defaultEmbeddings } as EmbeddingsModelSettings,
    summarizer: { ...defaultSummarizer } as SummarizerModelSettings,
    loadedChat: false,
    loadedEmbeddings: false,
    loadedSummarizer: false,
    loadingChat: false,
    loadingEmbeddings: false,
    loadingSummarizer: false
  }),

  actions: {
    async syncSelectableModels() {
      const modelsStore = useModelsStore()
      await modelsStore.fetchModels()
    },

    async fetchChatModels() {
      this.loadingChat = true
      try {
        const api = useApi()
        const res = await api.get<GetChatModelsSettingsRs>('/settings/models/chat')
        this.chatModels = res.models
        this.loadedChat = true
        return this.chatModels
      } finally {
        this.loadingChat = false
      }
    },

    async createChatModel(payload: UpsertChatModelRq) {
      this.loadingChat = true
      try {
        const api = useApi()
        await api.post<ChatModelSettings>('/settings/models/chat', payload)
        await this.fetchChatModels()
        await this.syncSelectableModels()
      } finally {
        this.loadingChat = false
      }
    },

    async updateChatModel(id: string, payload: UpsertChatModelRq) {
      this.loadingChat = true
      try {
        const api = useApi()
        await api.put<ChatModelSettings>(`/settings/models/chat/${id}`, payload)
        await this.fetchChatModels()
        await this.syncSelectableModels()
      } finally {
        this.loadingChat = false
      }
    },

    async deleteChatModel(id: string) {
      this.loadingChat = true
      try {
        const api = useApi()
        await api.del<null>(`/settings/models/chat/${id}`)
        this.chatModels = this.chatModels.filter((model) => model.id !== id)
        await this.syncSelectableModels()
      } finally {
        this.loadingChat = false
      }
    },

    async fetchEmbeddings() {
      this.loadingEmbeddings = true
      try {
        const api = useApi()
        this.embeddings = await api.get<EmbeddingsModelSettings>('/settings/models/embeddings')
        this.loadedEmbeddings = true
        return this.embeddings
      } finally {
        this.loadingEmbeddings = false
      }
    },

    /**
     * Saves the embedding model. The backend answers 409 when the change would delete indexed chunks and
     * `resetDocuments` is not set; the caller then asks the user and saves again with it.
     */
    async updateEmbeddings(payload: EmbeddingsModelSettings): Promise<SaveEmbeddingsResult> {
      this.loadingEmbeddings = true
      try {
        const api = useApi()
        this.embeddings = await api.put<EmbeddingsModelSettings>(
          '/settings/models/embeddings',
          payload,
          undefined,
          { silent: true }
        )
        return 'saved'
      } catch (err) {
        if (errorStatus(err) === 409 && !payload.resetDocuments) return 'needs-confirmation'
        useNotification().notify({ type: NotificationType.ERROR, message: errorMessage(err) })
        return 'failed'
      } finally {
        this.loadingEmbeddings = false
      }
    },

    async fetchSummarizer() {
      this.loadingSummarizer = true
      try {
        const api = useApi()
        this.summarizer = await api.get<SummarizerModelSettings>('/settings/models/summarizer')
        this.loadedSummarizer = true
        return this.summarizer
      } finally {
        this.loadingSummarizer = false
      }
    },

    async updateSummarizer(payload: SummarizerModelSettings) {
      this.loadingSummarizer = true
      try {
        const api = useApi()
        this.summarizer = await api.put<SummarizerModelSettings>(
          '/settings/models/summarizer',
          payload
        )
      } finally {
        this.loadingSummarizer = false
      }
    }
  }
})
