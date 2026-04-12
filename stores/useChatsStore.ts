import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

function mergeChats(existing: Chat[], incoming: Chat[]) {
  const seen = new Set<string>()
  const merged: Chat[] = []

  for (const chat of [...existing, ...incoming]) {
    if (seen.has(chat.id)) continue
    seen.add(chat.id)
    merged.push(chat)
  }

  return merged
}

function getPageMeta(pageData: Page<Chat>) {
  if (pageData.page) {
    return pageData.page
  }

  return {
    size: pageData.size ?? pageData.content.length,
    number: pageData.number ?? 0,
    totalElements: pageData.totalElements ?? pageData.content.length,
    totalPages: pageData.totalPages ?? 1
  }
}

function resolveHasMoreChats(pageData: Page<Chat>) {
  const meta = getPageMeta(pageData)

  if (typeof meta.number === 'number' && typeof meta.totalPages === 'number') {
    return meta.number + 1 < meta.totalPages
  }

  if (typeof pageData.last === 'boolean') {
    return !pageData.last
  }

  if (typeof meta.totalElements === 'number') {
    return pageData.content.length < meta.totalElements
  }

  return pageData.content.length >= meta.size
}

export const useChatsStore = defineStore('chats', {
  state: () => ({
    chats: [] as Chat[],
    messages: {} as Record<string, ChatMessage[]>,
    activeChatId: null as string | null,
    loading: false,
    chatsLoading: false,
    chatsLoadingMore: false,
    chatsInitialized: false,
    chatsPage: 0,
    chatsPageSize: 20,
    hasMoreChats: true
  }),

  getters: {
    activeChat(state): Chat | undefined {
      return state.chats.find((c) => c.id === state.activeChatId)
    },
    activeMessages(state): ChatMessage[] {
      return state.activeChatId ? (state.messages[state.activeChatId] ?? []) : []
    }
  },

  actions: {
    /** Get chats list */
    async fetchChats({
      page = 0,
      size,
      append = false
    }: {
      page?: number
      size?: number
      append?: boolean
    } = {}) {
      if (append) {
        if (this.chatsLoadingMore || !this.hasMoreChats) return this.chats
        this.chatsLoadingMore = true
      } else {
        if (this.chatsLoading) return this.chats
        this.chatsLoading = true
      }

      try {
        const api = useApi()
        const nextSize = size ?? this.chatsPageSize
        const res = await api.get<GetChatsRs>('/chats', { query: { page, size: nextSize } })
        const meta = getPageMeta(res.chats)

        this.chats = append ? mergeChats(this.chats, res.chats.content) : res.chats.content
        this.chatsPage = meta.number
        this.chatsPageSize = meta.size
        this.hasMoreChats = resolveHasMoreChats(res.chats)
        this.chatsInitialized = true
        return this.chats
      } finally {
        if (append) {
          this.chatsLoadingMore = false
        } else {
          this.chatsLoading = false
        }
      }
    },

    async initializeChats(size?: number) {
      return this.fetchChats({ page: 0, size: size ?? this.chatsPageSize })
    },

    async refreshChats() {
      const loadedChatsCount = Math.max(this.chats.length, this.chatsPageSize)
      return this.fetchChats({ page: 0, size: loadedChatsCount })
    },

    async loadNextChatsPage() {
      if (!this.chatsInitialized) {
        return this.initializeChats()
      }

      if (!this.hasMoreChats) return this.chats

      return this.fetchChats({
        page: this.chatsPage + 1,
        size: this.chatsPageSize,
        append: true
      })
    },

    async ensureChatLoaded(chatId: string) {
      let chat = this.chats.find((item) => item.id === chatId)
      if (chat) return chat

      if (!this.chatsInitialized) {
        await this.initializeChats()
        chat = this.chats.find((item) => item.id === chatId)
        if (chat) return chat
      }

      while (this.hasMoreChats) {
        await this.loadNextChatsPage()
        chat = this.chats.find((item) => item.id === chatId)
        if (chat) return chat
      }

      return undefined
    },

    /** Create new chat */
    async createChat(payload: CreateChatRq) {
      this.loading = true
      try {
        const api = useApi()
        const router = useRouter()
        const res = await api.post<CreateChatRs>('/chats', payload)

        const chat: Chat = {
          id: res.chatId,
          title: res.title,
          modelId: res.modelId ?? res.modelName,
          modelName: res.modelName,
          ragSpaces: payload.ragSpaces
        }

        this.chats = mergeChats([chat], this.chats)
        this.activeChatId = chat.id
        await router.push({ name: 'chats-id', params: { id: chat.id } })
        this.messages[chat.id] = []
        this.chatsInitialized = true
        return chat
      } finally {
        this.loading = false
      }
    },

    /** Send message */
    async sendMessage(chatId: string, payload: { modelId: string; text: string }) {
      const config = useRuntimeConfig()
      const baseURL = import.meta.server
        ? (config.apiBase as string)
        : (config.public.apiBase as string)

      this.loading = true
      if (!this.messages[chatId]) {
        this.messages = { ...this.messages, [chatId]: [] }
      }

      this.messages[chatId]?.push({ role: 'USER', content: payload.text })
      this.messages[chatId]?.push({ role: 'ASSISTANT', content: '...' })

      const url = `${baseURL}/chats/${chatId}/stream`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload })
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantText = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const lines = part
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.replace(/^data:\s?/, ''))
            .join('\n')

          if (!lines || lines === '[DONE]') continue

          assistantText = lines.trim()

          const msgs = this.messages[chatId]
          if (!msgs) continue
          const lastIdx = msgs.length - 1

          this.messages[chatId]?.splice(lastIdx, 1, {
            role: 'ASSISTANT',
            content: assistantText
          })
        }
      }

      this.loading = false
    },

    /** Get chat history */
    async loadHistory(chatId: string) {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.get<ChatHistoryRs>(`/chats/${chatId}/history`)
        this.messages[chatId] = res.messages
      } finally {
        this.loading = false
      }
    },

    /** Delete chat */
    async deleteChat(chatId: string) {
      this.loading = true
      try {
        const api = useApi()

        await api.del<null>(`/chats/${chatId}`)

        this.chats = this.chats.filter((c) => c.id !== chatId)

        const { [chatId]: removed, ...rest } = this.messages
        this.messages = rest
      } finally {
        this.loading = false
      }
    },

    /** Update model for chat */
    async updateModel(chatId: string, modelId: string) {
      this.loading = true
      try {
        const api = useApi()
        await api.patch(`/chats/${chatId}/model`, { modelId } satisfies UpdateChatModelRq)

        const chat = this.chats.find((c) => c.id === chatId)
        if (chat) {
          chat.modelId = modelId
          chat.modelName = modelId
        }
      } finally {
        this.loading = false
      }
    }
  }
})
