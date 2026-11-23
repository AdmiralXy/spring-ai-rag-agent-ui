<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNewChat } from '~/composables/useNewChat'
import { displayChatTitle } from '~/utils/chat'

const chatsStore = useChatsStore()
const modelsStore = useModelsStore()
const { startNewChat } = useNewChat()

useLazyAsyncData('chats-home', async () => {
  if (!chatsStore.chatsInitialized) await chatsStore.initializeChats()
  return true
})

const recent = computed(() => chatsStore.chats.slice(0, 4))
// relative times are rendered on the client only, so SSR and hydration agree
const now = ref<number | null>(null)
onMounted(() => (now.value = Date.now()))

function isAgentChat(chat: Chat) {
  const id = chat.modelId || chat.modelName
  return id ? modelsStore.getByValue(id)?.provider === 'AGENT' : false
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function when(chat: Chat) {
  const time = Date.parse(chat.updatedAt ?? chat.createdAt ?? '')
  if (now.value === null || Number.isNaN(time)) return ''
  const minutes = Math.round((time - now.value) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}
</script>

<template>
  <div class="home">
    <div class="home__inner">
      <div class="home__mark"><Icon name="lucide:sparkle" /></div>
      <h1 class="home__title">What can I help with?</h1>
      <p class="home__subtitle">
        Chat with your models, search your knowledge spaces, or let the agent write and run code in
        its sandbox.
      </p>
      <button
        type="button"
        class="ui-btn ui-btn--primary ui-btn--lg"
        :disabled="chatsStore.loading"
        @click="startNewChat"
      >
        <Icon name="lucide:plus" />
        New chat
      </button>

      <section
        v-if="!chatsStore.chatsInitialized && chatsStore.chatsLoading"
        class="home__recent"
        aria-label="Loading recent chats"
        aria-busy="true"
      >
        <USkeleton class="h-3 w-16 rounded" />
        <div class="ui-group">
          <div v-for="n in 4" :key="n" class="ui-group-row home__row">
            <USkeleton class="h-4 w-4 flex-none rounded" />
            <USkeleton class="h-4 flex-1 rounded" :style="{ maxWidth: `${70 - n * 9}%` }" />
            <div class="flex-1" />
            <USkeleton class="h-3 w-14 flex-none rounded" />
          </div>
        </div>
      </section>

      <section v-else-if="recent.length" class="home__recent" aria-label="Recent chats">
        <div class="ui-section-label">Recent</div>
        <div class="ui-group">
          <NuxtLink
            v-for="chat in recent"
            :key="chat.id"
            :to="{ name: 'chats-id', params: { id: chat.id } }"
            class="ui-group-row home__row"
          >
            <Icon
              :name="isAgentChat(chat) ? 'lucide:terminal' : 'lucide:message-circle'"
              class="home__row-icon"
            />
            <span class="home__row-title">{{ displayChatTitle(chat.title) }}</span>
            <span class="home__row-time">{{ when(chat) }}</span>
            <Icon name="lucide:chevron-right" class="home__row-chevron" />
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.home {
  @apply flex h-full overflow-y-auto px-6 py-12;
}

.home__inner {
  @apply m-auto flex w-full max-w-[520px] flex-col items-center gap-4 text-center;
}

.home__mark {
  @apply mb-2 flex h-14 w-14 items-center justify-center rounded-[16px] text-[26px];
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-accent);
}

.home__title {
  @apply m-0 text-[30px] font-bold tracking-[-0.02em];
  color: var(--c-text);
}

.home__subtitle {
  @apply m-0 mb-2 max-w-[440px] text-[15px] leading-relaxed;
  color: var(--c-text-3);
}

.home__recent {
  @apply mt-8 flex w-full flex-col gap-2 text-left;
}

.home__row {
  @apply text-sm;
}

.home__row-icon {
  @apply flex-none text-base;
  color: var(--c-text-3);
}

.home__row-title {
  @apply min-w-0 flex-1 truncate;
}

.home__row-time {
  @apply flex-none text-xs;
  color: var(--c-text-4);
}

.home__row-chevron {
  @apply flex-none;
  color: #636366;
}
</style>
