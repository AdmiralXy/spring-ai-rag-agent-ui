/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import { readSseEvents } from '~/utils/sse'

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
    hasMoreChats: true,
    /** Chats with an answer currently streaming */
    streamingChatIds: [] as string[],
    /** Incremented on every stream event (used for auto-scroll) */
    streamTick: 0,
    /** Incremented when the agent changes workspace files, per chat */
    filesRevision: {} as Record<string, number>,
    /** Sidebar search: results for `searchQuery`, `null` when not searching */
    searchQuery: '',
    searchResults: null as Chat[] | null,
    searchLoading: false
  }),

  getters: {
    activeChat(state): Chat | undefined {
      return state.chats.find((c) => c.id === state.activeChatId)
    },
    activeMessages(state): ChatMessage[] {
      return state.activeChatId ? (state.messages[state.activeChatId] ?? []) : []
    },
    isStreaming(state) {
      return (chatId: string) => state.streamingChatIds.includes(chatId)
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

        const now = new Date().toISOString()
        const chat: Chat = {
          id: res.chatId,
          title: res.title,
          modelId: res.modelId ?? res.modelName,
          modelName: res.modelName,
          ragSpaces: payload.ragSpaces,
          createdAt: now,
          updatedAt: now
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

    /** Send message and stream the answer (plain models: text deltas, agent: text + steps) */
    async sendMessage(
      chatId: string,
      payload: {
        modelId: string
        text: string
        agent?: boolean
        thinking?: ThinkingLevel
        images?: ChatAttachment[]
      }
    ) {
      const config = useRuntimeConfig()
      const baseURL = import.meta.server
        ? (config.apiBase as string)
        : (config.public.apiBase as string)
      const { notify } = useNotification()

      if (!this.messages[chatId]) {
        this.messages = { ...this.messages, [chatId]: [] }
      }
      const list = this.messages[chatId]!
      list.push({
        role: 'USER',
        content: payload.text,
        ...(payload.images?.length ? { attachments: payload.images } : {})
      })
      const userMsg = list[list.length - 1]!
      list.push({
        role: 'ASSISTANT',
        content: '',
        pending: true,
        agent: Boolean(payload.agent),
        ...(payload.agent ? { parts: [] } : {})
      })
      // Work with the reactive proxy so every mutation re-renders the message.
      const msg = list[list.length - 1]!

      this.streamingChatIds = [...this.streamingChatIds, chatId]
      this.touchChat(chatId)
      try {
        const response = await fetch(`${baseURL}/chats/${chatId}/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            modelId: payload.modelId,
            text: payload.text,
            thinking: payload.thinking ?? null,
            images: payload.images?.length ? payload.images : null
          })
        })

        if (!response.ok || !response.body) {
          let message = `Request failed: ${response.status}`
          try {
            const body = await response.json()
            message = body?.detail || body?.message || message
          } catch {
            // not JSON
          }
          throw new Error(message)
        }

        for await (const { event, data } of readSseEvents(response.body)) {
          let json: Record<string, any> = {}
          try {
            json = JSON.parse(data)
          } catch {
            json = { delta: data }
          }
          if (event === 'message' && json.role === 'USER') {
            userMsg.id = json.id
            continue
          }
          if (event === 'done' && json.rejected) {
            // the backend refused the message before storing it: keep the text in the composer flow
            userMsg.rejected = true
            msg.rejected = true
          }
          this.applyStreamEvent(chatId, msg, event, json)
        }
      } catch (err: any) {
        const message = err?.message || 'Stream failed'
        this.applyStreamEvent(chatId, msg, 'error', { message })
        notify({ type: NotificationType.ERROR, message })
      } finally {
        msg.pending = false
        msg.status = undefined
        if (!msg.content && !msg.parts?.length) {
          msg.content = '(no answer)'
        }
        this.streamingChatIds = this.streamingChatIds.filter((id) => id !== chatId)
        this.streamTick++
      }
    },

    applyStreamEvent(chatId: string, msg: ChatMessage, event: string, data: Record<string, any>) {
      const appendText = (type: 'text' | 'thinking', delta: string, newBlock: boolean) => {
        if (!delta) return
        // a regular model switches to parts once it streams reasoning
        if (!msg.parts && type === 'thinking') {
          msg.parts = msg.content ? [{ type: 'text', text: msg.content }] : []
        }
        if (!msg.parts) {
          msg.content += delta
          return
        }
        const last = msg.parts[msg.parts.length - 1]
        if (last && last.type === type) {
          last.text = (last.text ?? '') + (newBlock && last.text ? '\n\n' : '') + delta
        } else {
          msg.parts.push({ type, text: delta })
        }
        if (type === 'text') {
          msg.content = msg.parts
            .filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join('\n\n')
        }
      }

      switch (event) {
        case 'text':
          appendText('text', String(data.delta ?? ''), Boolean(data.newBlock))
          msg.status = undefined
          break
        case 'thinking':
          appendText('thinking', String(data.delta ?? ''), Boolean(data.newBlock))
          break
        case 'tool_start':
          msg.parts?.push({
            type: 'tool',
            toolId: data.id,
            name: data.name,
            title: data.title,
            input: data.input,
            parentId: data.parentId ?? undefined
          })
          msg.status = undefined
          break
        case 'tool_end': {
          const step = msg.parts?.findLast((p) => p.type === 'tool' && p.toolId === data.id)
          if (step) {
            step.output = data.output ?? ''
            step.isError = Boolean(data.isError)
          }
          break
        }
        case 'files_changed':
          this.filesRevision = {
            ...this.filesRevision,
            [chatId]: (this.filesRevision[chatId] ?? 0) + 1
          }
          break
        case 'status':
          msg.status = data.message
          break
        case 'message':
          if (data.role === 'ASSISTANT') msg.id = data.id
          break
        case 'notice':
          if (!msg.parts) {
            msg.parts = msg.content ? [{ type: 'text', text: msg.content }] : []
          }
          msg.parts.push({ type: 'notice', text: data.message, name: data.kind })
          break
        case 'error':
          // shown as a red block, the same way the backend stores failed answers
          if (!msg.parts) {
            msg.parts = msg.content ? [{ type: 'text', text: msg.content }] : []
          }
          msg.parts.push({ type: 'error', text: data.message })
          break
        case 'done':
          if (msg.agent) {
            msg.stats = {
              numTurns: data.numTurns ?? 0,
              durationMs: data.durationMs ?? 0,
              costUsd: data.costUsd ?? 0,
              usage: data.usage ?? null,
              interrupted: Boolean(data.interrupted)
            }
            this.filesRevision = {
              ...this.filesRevision,
              [chatId]: (this.filesRevision[chatId] ?? 0) + 1
            }
          }
          break
        default:
          break
      }
      this.streamTick++
    },

    /** Moves the chat to the top of the list (the backend sorts by last activity too) */
    touchChat(chatId: string) {
      const index = this.chats.findIndex((c) => c.id === chatId)
      if (index === -1) return
      const chat = { ...this.chats[index]!, updatedAt: new Date().toISOString() }
      this.chats = [chat, ...this.chats.filter((c) => c.id !== chatId)]
    },

    /** Sidebar search by chat title */
    async searchChats(query: string) {
      this.searchQuery = query
      const q = query.trim()
      if (!q) {
        this.searchResults = null
        return
      }
      this.searchLoading = true
      try {
        const api = useApi()
        const res = await api.get<GetChatsRs>('/chats', { query: { page: 0, size: 50, q } })
        if (this.searchQuery.trim() === q) this.searchResults = res.chats.content
      } finally {
        this.searchLoading = false
      }
    },

    /** Stop the answer being generated (the partial answer is kept) */
    async stopMessage(chatId: string) {
      const api = useApi()
      await api.post<{ stopped: boolean }>(`/chats/${chatId}/stop`)
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

    /**
     * Delete messages of a chat; the models forget them too. Messages without a known id (a stream that
     * was stopped) get their ids from the history first.
     */
    async deleteMessages(chatId: string, messages: ChatMessage[]) {
      if (messages.some((m) => !m.id)) await this.syncMessageIds(chatId)
      const ids = messages.map((m) => m.id).filter((id): id is string => Boolean(id))
      const list = this.messages[chatId] ?? []
      if (ids.length) {
        const api = useApi()
        await api.del<{ deleted: number }>(`/chats/${chatId}/messages`, {
          query: { ids: ids.join(',') }
        })
      }
      // messages that were never stored (a rejected send) only exist here
      this.messages[chatId] = list.filter(
        (m) => !messages.includes(m) && !(m.id && ids.includes(m.id))
      )
    },

    /** Copies server ids onto local messages that lack them (same order as the history) */
    async syncMessageIds(chatId: string) {
      const api = useApi()
      const res = await api.get<ChatHistoryRs>(`/chats/${chatId}/history`)
      const local = (this.messages[chatId] ?? []).filter((m) => !m.rejected)
      if (local.length !== res.messages.length) {
        this.messages[chatId] = res.messages
        return
      }
      local.forEach((m, i) => {
        if (!m.id) m.id = res.messages[i]?.id
      })
    },

    /** Delete chat */
    async deleteChat(chatId: string) {
      this.loading = true
      try {
        const api = useApi()

        await api.del<null>(`/chats/${chatId}`)

        this.chats = this.chats.filter((c) => c.id !== chatId)
        if (this.searchResults)
          this.searchResults = this.searchResults.filter((c) => c.id !== chatId)

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
