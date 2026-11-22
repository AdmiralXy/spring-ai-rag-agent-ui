<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue'
import ChatMessages from '~/components/ChatMessages.vue'
import ChatInput from '~/components/ChatInput.vue'
import WorkspaceFilesPanel from '~/components/agent/WorkspaceFilesPanel.vue'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import { usePromptTemplatesStore } from '~/stores/usePromptTemplatesStore'
import { displayChatTitle } from '~/utils/chat'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const router = useRouter()
const chatsStore = useChatsStore()
const spacesStore = useSpacesStore()
const promptTemplatesStore = usePromptTemplatesStore()
const { notify } = useNotification()
const { confirm } = useConfirmDialog()

const chatId = router.currentRoute.value.params.id as string
chatsStore.activeChatId = chatId
await chatsStore.ensureChatLoaded(chatId)
await chatsStore.loadHistory(chatId)

const messagesContainer = ref<HTMLDivElement | null>(null)
const draftText = ref('')

const currentChat = computed(() => chatsStore.activeChat)
const currentSpaces = computed(() =>
  currentChat.value
    ? currentChat.value.ragSpaces
        .map((spaceId) => spacesStore.getById(spaceId))
        .filter((space): space is Space => Boolean(space))
    : []
)
const currentSpacesLabel = computed(() => currentSpaces.value.map((space) => space.name).join(', '))
const title = computed(() => displayChatTitle(currentChat.value?.title))
const selectedModelLabel = computed(
  () => modelsStore.getByValue(selectedModelId.value)?.label ?? ''
)

const modelsStore = useModelsStore()
await useAsyncData('models', async () => {
  await modelsStore.fetchModels()
  return modelsStore.models
})

await useAsyncData('prompt-templates-chat', async () => {
  await promptTemplatesStore.fetchPromptTemplates()
  return promptTemplatesStore.templates
})

const selectedModelId = ref('')
const thinkingLevel = ref<ThinkingLevel>('medium')
const THINKING_KEY = 'chat-thinking-level:'
const THINKING_LEVELS: ThinkingLevel[] = ['off', 'low', 'medium', 'high']

// the effort level is remembered per model (browser storage, a convenience only)
watch(
  selectedModelId,
  (id) => {
    if (!import.meta.client || !id) return
    try {
      const stored = window.localStorage.getItem(THINKING_KEY + id) as ThinkingLevel | null
      thinkingLevel.value = stored && THINKING_LEVELS.includes(stored) ? stored : 'medium'
    } catch {
      thinkingLevel.value = 'medium'
    }
  },
  { immediate: true }
)

watch(thinkingLevel, (level) => {
  if (!import.meta.client || !selectedModelId.value) return
  try {
    window.localStorage.setItem(THINKING_KEY + selectedModelId.value, level)
  } catch {
    // storage unavailable
  }
})
const showFiles = ref(false)
const fileCount = ref(0)

const isAgentModel = computed(
  () => modelsStore.getByValue(selectedModelId.value)?.provider === 'AGENT'
)
const streaming = computed(() => chatsStore.isStreaming(chatId))
const filesRevision = computed(() => chatsStore.filesRevision[chatId] ?? 0)
const filesAvailable = computed(() => isAgentModel.value || fileCount.value > 0)
const emptyText = computed(() => {
  if (isAgentModel.value) {
    return 'It writes code, runs it in an isolated sandbox and checks the result. Files it creates appear in the workspace.'
  }
  if (currentSpaces.value.length) return `Answers use knowledge from ${currentSpacesLabel.value}.`
  return 'Ask anything. Attach text files with the paperclip, paste screenshots for models with images.'
})

// stable keys for rendered messages (ids arrive while a message streams, indexes shift on delete)
const messageKeys = new WeakMap<object, number>()
let nextMessageKey = 0
function messageKey(message: ChatMessage) {
  const raw = toRaw(message)
  let key = messageKeys.get(raw)
  if (key === undefined) {
    key = ++nextMessageKey
    messageKeys.set(raw, key)
  }
  return key
}

/** A question goes together with its answer; an answer can be deleted on its own */
async function handleDelete(index: number) {
  const messages = chatsStore.activeMessages
  const message = messages[index]
  if (!message || streaming.value) return
  const targets = [message]
  const next = messages[index + 1]
  if (message.role === 'USER' && next && next.role !== 'USER') targets.push(next)

  const ok = await confirm(
    message.role === 'USER' ? 'Delete this question and its answer?' : 'Delete this answer?',
    'The model will no longer see it in this chat. This cannot be undone.'
  )
  if (!ok) return
  try {
    await chatsStore.deleteMessages(chatId, targets)
  } catch {
    // the API composable has shown the error
  }
}

async function handleContinue() {
  await handleSend({ text: 'Continue exactly where you stopped.', files: [], images: [] })
}

function resolveChatModelId(chat?: Chat) {
  return chat?.modelId || chat?.modelName || modelsStore.models[0]?.value || ''
}

watch(
  [currentChat, () => modelsStore.models],
  ([chat, models]) => {
    if (!models.length) {
      selectedModelId.value = ''
      return
    }

    const resolved = resolveChatModelId(chat)
    if (!selectedModelId.value || !models.some((item) => item.value === selectedModelId.value)) {
      selectedModelId.value = resolved
    }
  },
  { immediate: true, deep: true }
)

async function scrollToBottom(smooth = false) {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }
}

function isNearBottom() {
  const el = messagesContainer.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 160
}

watch(
  () => chatsStore.activeMessages.length,
  async () => {
    await scrollToBottom(true)
  }
)

// Follow the streaming answer only while the user stays at the bottom.
watch(
  () => chatsStore.streamTick,
  async () => {
    if (isNearBottom()) await scrollToBottom(false)
  }
)

async function handleStop() {
  await chatsStore.stopMessage(chatId)
}

onMounted(async () => {
  await scrollToBottom(false)
})

async function buildMessageWithFiles(text: string, files: File[]) {
  if (!files.length) return text.trim()

  try {
    const fileBlocks = await Promise.all(
      files.map(async (file) => {
        const rawContent = await file.text()
        const content = rawContent.trim() || '[empty file]'
        return `File "${file.name}" uploaded by the user. Content:\n${content}`
      })
    )

    return [...fileBlocks, text.trim()].filter(Boolean).join('\n\n')
  } catch {
    notify({
      type: NotificationType.ERROR,
      message: 'Failed to read the selected files'
    })
    return ''
  }
}

async function handleSend(payload: { text: string; files: File[]; images: ChatAttachment[] }) {
  const text = await buildMessageWithFiles(payload.text, payload.files)
  if (!text && !payload.images.length) return

  const isFirstMessageInChat = chatsStore.activeMessages.length === 0
  const previousTitle = currentChat.value?.title

  const selected = selectedModelId.value
  const current = currentChat.value?.modelId || currentChat.value?.modelName

  if (!selected) {
    notify({
      type: NotificationType.WARNING,
      message: 'Select a model before sending a message'
    })
    return
  }

  if (!current || current !== selected) {
    await chatsStore.updateModel(chatId, selected)
  }

  await chatsStore.sendMessage(chatId, {
    modelId: selected,
    text,
    agent: isAgentModel.value,
    thinking: modelsStore.getByValue(selected)?.thinking ? thinkingLevel.value : undefined,
    images: payload.images
  })

  if (isFirstMessageInChat) {
    await chatsStore.refreshChats()

    const updatedTitle = chatsStore.chats.find((chat) => chat.id === chatId)?.title
    if (previousTitle && updatedTitle === previousTitle) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      await chatsStore.refreshChats()
    }
  }
}
</script>

<template>
  <div class="chat">
    <div class="chat__main">
      <header class="chat__header">
        <div class="chat__heading">
          <h1 class="chat__title">{{ title }}</h1>
          <p class="chat__meta">
            <span v-if="selectedModelLabel">{{ selectedModelLabel }}</span>
            <template v-if="currentSpaces.length">
              <span class="chat__meta-dot" aria-hidden="true">·</span>
              <Icon name="lucide:layers" class="chat__meta-icon" />
              <span class="truncate">{{ currentSpacesLabel }}</span>
            </template>
          </p>
        </div>
        <client-only>
          <button
            v-if="filesAvailable"
            type="button"
            class="chat__files-btn"
            :class="{ 'chat__files-btn--active': showFiles }"
            :aria-pressed="showFiles"
            title="Agent workspace files"
            @click="showFiles = !showFiles"
          >
            <Icon name="lucide:folder" />
            <span class="max-sm:hidden">Files</span>
            <span v-if="fileCount" class="ui-badge">{{ fileCount }}</span>
          </button>
        </client-only>
      </header>

      <div ref="messagesContainer" class="chat__scroll">
        <div class="chat__messages">
          <template v-if="chatsStore.activeMessages.length > 0">
            <ChatMessages
              v-for="(m, idx) in chatsStore.activeMessages"
              :key="messageKey(m)"
              :role="m.role"
              :content="m.content"
              :parts="m.parts"
              :pending="m.pending"
              :status="m.status"
              :stats="m.stats"
              :agent="m.agent"
              :attachments="m.attachments"
              :deletable="!streaming"
              :last="idx === chatsStore.activeMessages.length - 1"
              @delete="handleDelete(idx)"
              @continue="handleContinue"
            />
          </template>

          <div v-else class="chat__empty">
            <div class="chat__empty-mark">
              <Icon :name="isAgentModel ? 'lucide:terminal' : 'lucide:sparkle'" />
            </div>
            <h2 class="chat__empty-title">
              {{ isAgentModel ? 'The agent is ready' : 'How can I help?' }}
            </h2>
            <p class="chat__empty-text">{{ emptyText }}</p>
          </div>
        </div>
      </div>

      <div class="chat__composer">
        <client-only>
          <ChatInput
            v-model:text="draftText"
            v-model:model="selectedModelId"
            v-model:thinking="thinkingLevel"
            :models="modelsStore.models"
            :loading="chatsStore.loading || streaming"
            :streaming="streaming"
            :prompt-templates="promptTemplatesStore.templates"
            @send="handleSend"
            @stop="handleStop"
          />
        </client-only>
        <p v-if="isAgentModel" class="chat__disclaimer">
          The agent runs code in an isolated sandbox.
        </p>
      </div>
    </div>

    <client-only>
      <div v-if="filesAvailable" v-show="showFiles" class="chat__files">
        <WorkspaceFilesPanel
          :chat-id="chatId"
          :revision="filesRevision"
          @close="showFiles = false"
          @count="fileCount = $event"
        />
      </div>
    </client-only>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.chat {
  @apply relative flex h-full min-h-0 overflow-hidden;
}

.chat__main {
  @apply relative flex min-h-0 min-w-0 flex-1 flex-col;
}

.chat__header {
  @apply flex h-[52px] flex-none items-center gap-3 pr-4 pl-6 max-lg:pl-15;
  border-bottom: 1px solid var(--c-sep);
}

.chat__heading {
  @apply flex min-w-0 flex-1 items-baseline gap-2.5 max-md:flex-col max-md:gap-0;
}

.chat__title {
  @apply m-0 min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] max-md:max-w-full;
  color: var(--c-text);
}

.chat__meta {
  @apply m-0 flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap;
  color: var(--c-text-4);
}

.chat__meta-dot {
  @apply mx-0.5;
}

.chat__meta-icon {
  @apply flex-none text-[11px];
}

.chat__files-btn {
  @apply inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition-colors;
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-text-2);
}

.chat__files-btn:hover {
  color: var(--c-text);
  background: var(--c-surface-3);
}

.chat__files-btn--active {
  background: var(--c-accent-soft);
  border-color: rgba(64, 156, 255, 0.5);
  color: var(--c-text);
}

.chat__scroll {
  @apply min-h-0 flex-1 overflow-y-auto px-6 pt-7 pb-4 max-sm:px-4;
}

.chat__messages {
  @apply mx-auto flex min-h-full w-full max-w-[760px] flex-col gap-6;
}

.chat__empty {
  @apply m-auto flex max-w-[440px] flex-col items-center gap-3 py-16 text-center;
}

.chat__empty-mark {
  @apply mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] text-[22px];
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-accent);
}

.chat__empty-title {
  @apply m-0 text-[22px] font-semibold tracking-[-0.01em];
  color: var(--c-text);
}

.chat__empty-text {
  @apply m-0 text-sm leading-relaxed;
  color: var(--c-text-3);
}

.chat__composer {
  @apply flex-none px-6 pt-2 pb-5 max-sm:px-3 max-sm:pb-3;
}

.chat__disclaimer {
  @apply mx-auto mt-2 max-w-[760px] text-center text-[11px];
  color: var(--c-text-4);
}

.chat__files {
  @apply absolute inset-0 z-20 flex md:static md:inset-auto md:z-auto md:flex-none;
}
</style>
