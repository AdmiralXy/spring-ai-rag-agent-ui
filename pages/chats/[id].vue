<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ChatMessages from '~/components/ChatMessages.vue'
import ChatInput from '~/components/ChatInput.vue'

const router = useRouter()
const chatsStore = useChatsStore()
const spacesStore = useSpacesStore()

const chatId = router.currentRoute.value.params.id as string
chatsStore.activeChatId = chatId
await chatsStore.loadHistory(chatId)

const messagesContainer = ref<HTMLDivElement | null>(null)

const currentChat = computed(() => chatsStore.activeChat)
const currentSpace = computed(() =>
  currentChat.value ? spacesStore.getById(currentChat.value.ragSpace) : null
)

const modelsStore = useModelsStore()
await useAsyncData('models', async () => {
  await modelsStore.fetchModels()
  return modelsStore.models
})

const models = modelsStore.models
const selectedModel = ref(models.find((m) => m.value === currentChat.value?.modelName) || models[0])

watch(currentChat, (newChat) => {
  if (!newChat) return
  const found = models.find((m) => m.value === newChat.modelName)
  selectedModel.value = found || models[0]
})

async function scrollToBottom(smooth = false) {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }
}

watch(
  () => chatsStore.activeMessages.length,
  async () => {
    await scrollToBottom(true)
  }
)

watch(
  () => chatsStore.activeMessages.at(-1)?.content,
  async () => {
    await scrollToBottom(true)
  }
)

onMounted(async () => {
  await scrollToBottom(false)
})

async function handleSend(text: string) {
  if (!text.trim()) return

  const selected = selectedModel.value?.value as string
  const current = currentChat.value?.modelName

  if (!current || current !== selected) {
    await chatsStore.updateModelName(chatId, selected)
  }

  await chatsStore.sendMessage(chatId, {
    modelName: selected,
    text
  })
}
</script>

<template>
  <div class="chat-area">
    <client-only>
      <div v-if="currentSpace" class="chat-area__space-label">Space: {{ currentSpace.name }}</div>
      <div class="chat-area__model-input">
        <USelectMenu
          v-model="selectedModel"
          :items="models"
          option-attribute="label"
          value-attribute="value"
          placeholder="Model"
          :ui="{
            base: 'mx-18 lg:mx-4 my-1 max-w-[14rem] min-w-[10rem] md:max-w-[18rem] lg:max-w-[22rem] bg-[#2a2a2a] text-white border border-[#474747]',
            content: 'bg-[#2a2a2a] text-white',
            item: 'bg-[#272727] border border-[#474747]',
            input: 'bg-[#2a2a2a] text-white text-sm py-0.5 px-2 rounded-md',
            placeholder: 'text-gray-300',
            value: 'text-white text-sm'
          }"
        />
      </div>
    </client-only>

    <div ref="messagesContainer" class="chat-area__messages">
      <template v-if="chatsStore.activeMessages.length > 0">
        <ChatMessages
          v-for="(m, idx) in chatsStore.activeMessages"
          :key="idx"
          :role="m.role"
          :content="m.content"
        />
      </template>

      <template v-else>
        <div class="empty-state">
          <div class="empty-state__icon">
            <Icon name="pixel:face-thinking-solid"></Icon>
          </div>
          <div class="empty-state__text">Write your first message!</div>
        </div>
      </template>
    </div>

    <div class="chat-area__footer">
      <client-only>
        <ChatInput :loading="chatsStore.loading" @send="handleSend" />
      </client-only>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.chat-area {
  @apply relative flex min-h-0 flex-1 flex-col overflow-x-hidden;
}

.chat-area__space-label {
  @apply pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 opacity-80;
}

.chat-area__messages {
  @apply flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-8 pb-4;
  overflow-x: hidden;
}

.empty-state {
  @apply m-auto flex flex-col items-center text-center text-gray-500 opacity-80 select-none;
}

.chat-area__footer {
  @apply p-3;
}

.chat-area__model-input {
  margin: 1rem 1rem;
}
</style>
