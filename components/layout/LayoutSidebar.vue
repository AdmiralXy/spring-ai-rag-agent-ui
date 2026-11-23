<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useNewChat } from '~/composables/useNewChat'
import BuildInfoModal from '~/components/layout/BuildInfoModal.vue'
import { displayChatTitle } from '~/utils/chat'

defineProps<{ closable?: boolean }>()
const emit = defineEmits<{ navigate: []; close: [] }>()

const { confirm } = useConfirmDialog()
const { startNewChat } = useNewChat()
const chatsStore = useChatsStore()
const spacesStore = useSpacesStore()
const modelsStore = useModelsStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

useLazyAsyncData('spaces-sidebar', async () => {
  if (!spacesStore.spaces.length) {
    await spacesStore.fetchSpaces(1000)
  }
  return spacesStore.spaces
})

useLazyAsyncData('chats', async () => {
  if (!chatsStore.chatsInitialized) {
    await chatsStore.initializeChats()
  }
  return chatsStore.chats
})

useLazyAsyncData('models-sidebar', async () => {
  if (!modelsStore.models.length) await modelsStore.fetchModels()
  return modelsStore.models
})

const isBuildInfoOpen = ref(false)
const chatsListRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const query = ref(chatsStore.searchQuery)

const navItems = [
  {
    to: '/',
    label: 'Chats',
    icon: 'lucide:message-circle',
    match: (p: string) => p === '/' || p.startsWith('/chats')
  },
  {
    to: '/spaces',
    label: 'Spaces',
    icon: 'lucide:layers',
    match: (p: string) => p.startsWith('/spaces')
  },
  {
    to: '/files',
    label: 'Files',
    icon: 'lucide:folder',
    match: (p: string) => p.startsWith('/files')
  },
  {
    to: '/prompts',
    label: 'Prompts',
    icon: 'lucide:file-text',
    match: (p: string) => p.startsWith('/prompts')
  }
]

const activeChatId = computed(() => route.params.id as string | undefined)
const isSearching = computed(() => chatsStore.searchResults !== null)

function isAgentChat(chat: Chat) {
  const id = chat.modelId || chat.modelName
  return id ? modelsStore.getByValue(id)?.provider === 'AGENT' : false
}

const DAY = 24 * 60 * 60 * 1000

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

const groups = computed(() => {
  const source = chatsStore.searchResults ?? chatsStore.chats
  if (isSearching.value) {
    return [{ label: source.length ? 'Results' : '', chats: source }]
  }

  const today = startOfToday()
  const buckets: Array<{ label: string; from: number; chats: Chat[] }> = [
    { label: 'Today', from: today, chats: [] },
    { label: 'Yesterday', from: today - DAY, chats: [] },
    { label: 'Previous 7 days', from: today - 7 * DAY, chats: [] },
    { label: 'Previous 30 days', from: today - 30 * DAY, chats: [] },
    { label: 'Older', from: Number.NEGATIVE_INFINITY, chats: [] }
  ]

  for (const chat of source) {
    const time = Date.parse(chat.updatedAt ?? chat.createdAt ?? '')
    const stamp = Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
    const bucket = buckets.find((b) => stamp >= b.from) ?? buckets[buckets.length - 1]!
    bucket.chats.push(chat)
  }
  return buckets.filter((b) => b.chats.length)
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => chatsStore.searchChats(value), 250)
})

function clearSearch() {
  query.value = ''
  void chatsStore.searchChats('')
}

async function loadMoreChats() {
  if (isSearching.value) return
  if (chatsStore.chatsLoading || chatsStore.chatsLoadingMore || !chatsStore.hasMoreChats) return
  await chatsStore.loadNextChatsPage()
}

function onChatsScroll() {
  const container = chatsListRef.value
  if (!container) return
  const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  if (distanceToBottom <= 80) void loadMoreChats()
}

async function onNewChat() {
  await startNewChat()
  emit('navigate')
}

async function signOut() {
  const ok = await confirm('Sign out?', 'You will need your email and password to sign in again.')
  if (ok) await auth.logout()
}

async function removeChat(id: string) {
  const ok = await confirm('Delete chat?', 'The chat and its agent workspace will be deleted.')
  if (!ok) return
  await chatsStore.deleteChat(id)
  if (activeChatId.value === id) {
    chatsStore.activeChatId = null
    await router.push('/')
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchRef.value?.focus()
    searchRef.value?.select()
  }
}

watch(
  () => chatsStore.chats.length,
  async () => {
    await nextTick()
    onChatsScroll()
  }
)

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  onChatsScroll()
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <nav class="sb" aria-label="Sidebar">
    <div class="sb__brand">
      <NuxtLink to="/" class="sb__logo" aria-label="Home" @click="emit('navigate')">
        <span class="sb__logo-mark"><Icon name="lucide:sparkle" /></span>
        <span class="sb__logo-text">Agent</span>
      </NuxtLink>
      <button
        type="button"
        class="ui-icon-btn"
        aria-label="New chat"
        title="New chat"
        :disabled="chatsStore.loading"
        @click="onNewChat"
      >
        <Icon name="lucide:square-pen" />
      </button>
      <button
        v-if="closable"
        type="button"
        class="ui-icon-btn"
        aria-label="Close sidebar"
        title="Close sidebar"
        @click="emit('close')"
      >
        <Icon name="lucide:panel-left-close" />
      </button>
    </div>

    <label class="sb__search">
      <Icon name="lucide:search" class="sb__search-icon" />
      <input
        ref="searchRef"
        v-model="query"
        type="search"
        placeholder="Search chats"
        aria-label="Search chats"
        @keydown.esc="clearSearch"
      />
      <button
        v-if="query"
        type="button"
        class="sb__search-clear"
        aria-label="Clear search"
        @click="clearSearch"
      >
        <Icon name="lucide:x" />
      </button>
      <kbd v-else class="sb__kbd">⌘K</kbd>
    </label>

    <div class="sb__nav">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sb__nav-item"
        :class="{ 'sb__nav-item--active': item.match(route.path) }"
        @click="emit('navigate')"
      >
        <Icon :name="item.icon" class="sb__nav-icon" />
        {{ item.label }}
      </NuxtLink>
    </div>

    <div ref="chatsListRef" class="sb__chats" @scroll.passive="onChatsScroll">
      <div
        v-if="!isSearching && !chatsStore.chatsInitialized && chatsStore.chatsLoading"
        aria-busy="true"
        aria-label="Loading chats"
      >
        <USkeleton class="sb__skeleton-group" />
        <div v-for="n in 8" :key="n" class="sb__skeleton-row">
          <USkeleton
            class="h-3.5 rounded"
            :style="{ width: `${[72, 58, 84, 64, 46, 78, 60, 52][n - 1]}%` }"
          />
        </div>
      </div>
      <template v-for="group in groups" :key="group.label">
        <div v-if="group.label" class="sb__group">{{ group.label }}</div>
        <div
          v-for="chat in group.chats"
          :key="chat.id"
          class="sb__chat"
          :class="{ 'sb__chat--active': chat.id === activeChatId }"
        >
          <NuxtLink
            :to="{ name: 'chats-id', params: { id: chat.id } }"
            class="sb__chat-link"
            :aria-current="chat.id === activeChatId ? 'page' : undefined"
            @click="emit('navigate')"
          >
            <span class="sb__chat-title">{{ displayChatTitle(chat.title) }}</span>
            <Icon
              v-if="isAgentChat(chat)"
              name="lucide:terminal"
              class="sb__chat-agent"
              aria-label="Agent chat"
            />
          </NuxtLink>
          <button
            type="button"
            class="sb__chat-delete"
            aria-label="Delete chat"
            title="Delete chat"
            @click="removeChat(chat.id)"
          >
            <Icon name="lucide:trash-2" />
          </button>
        </div>
      </template>

      <p v-if="isSearching && !chatsStore.searchResults?.length" class="sb__status">
        {{ chatsStore.searchLoading ? 'Searching…' : 'No chats found' }}
      </p>
      <p v-else-if="!isSearching && chatsStore.chatsLoadingMore" class="sb__status">Loading…</p>
      <p
        v-else-if="!isSearching && chatsStore.chatsInitialized && !chatsStore.chats.length"
        class="sb__status"
      >
        No chats yet
      </p>
    </div>

    <div class="sb__footer">
      <NuxtLink
        to="/account"
        class="sb__user"
        :class="{ 'sb__user--active': route.path.startsWith('/account') }"
        :aria-current="route.path.startsWith('/account') ? 'page' : undefined"
        :title="auth.user?.email"
        @click="emit('navigate')"
      >
        <span class="sb__avatar">{{ auth.user?.email.charAt(0).toUpperCase() }}</span>
        <span class="sb__user-email">{{ auth.user?.email }}</span>
      </NuxtLink>
      <button
        type="button"
        class="ui-icon-btn"
        aria-label="Sign out"
        title="Sign out"
        @click="signOut"
      >
        <Icon name="lucide:log-out" />
      </button>
    </div>

    <div class="sb__footer sb__footer--compact">
      <NuxtLink
        to="/settings/models"
        class="sb__nav-item sb__nav-item--footer"
        :class="{ 'sb__nav-item--active': route.path.startsWith('/settings') }"
        @click="emit('navigate')"
      >
        <Icon name="lucide:settings" class="sb__nav-icon" />
        Settings
      </NuxtLink>
      <button
        type="button"
        class="ui-icon-btn"
        aria-label="About this build"
        title="About this build"
        @click="isBuildInfoOpen = true"
      >
        <Icon name="lucide:info" />
      </button>
    </div>

    <BuildInfoModal v-model:open="isBuildInfoOpen" />
  </nav>
</template>

<style scoped>
@import 'tailwindcss/theme';

.sb {
  @apply flex h-full flex-col gap-3.5 px-2.5 pt-3.5 pb-3;
  background: var(--c-sidebar);
  border-right: 1px solid var(--c-sep);
}

.sb__brand {
  @apply flex items-center gap-2 px-1.5 py-0.5;
}

.sb__logo {
  @apply flex flex-1 items-center gap-2.5;
  color: var(--c-text);
}

.sb__logo-mark {
  @apply flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[15px];
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-accent);
}

.sb__logo-text {
  @apply text-[15px] font-semibold tracking-[-0.01em];
}

.sb__search {
  @apply flex h-[34px] items-center gap-2 px-2.5;
  border-radius: var(--r-md);
  background: var(--c-surface-2);
  color: var(--c-text-4);
}

.sb__search:focus-within {
  box-shadow: 0 0 0 2px var(--c-accent-ring);
}

.sb__search-icon {
  @apply flex-none text-[15px];
}

.sb__search input {
  @apply min-w-0 flex-1 border-0 bg-transparent text-[13.5px] outline-none;
  color: var(--c-text);
}

.sb__search input::placeholder {
  color: var(--c-text-4);
}

.sb__search input::-webkit-search-cancel-button {
  display: none;
}

.sb__search-clear {
  @apply flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-0 text-[11px];
  background: var(--c-surface-4);
  color: var(--c-text);
}

.sb__kbd {
  @apply rounded-[5px] px-1.5 font-sans text-[11px] max-lg:hidden;
  border: 1px solid var(--c-sep-strong);
  color: var(--c-text-4);
}

.sb__nav {
  @apply flex flex-col gap-0.5;
}

.sb__nav-item {
  @apply flex h-[34px] flex-none items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] transition-colors;
  color: var(--c-text-2);
}

.sb__nav-item:hover {
  background: var(--c-hover);
  color: var(--c-text);
}

.sb__nav-icon {
  @apply flex-none text-[17px];
  color: var(--c-text-3);
}

.sb__nav-item--active {
  @apply font-medium;
  background: var(--c-selected);
  color: var(--c-text);
}

.sb__nav-item--active .sb__nav-icon {
  color: var(--c-accent);
}

.sb__chats {
  @apply -mx-1 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-1;
}

.sb__group {
  @apply px-2.5 pt-3 pb-1 text-[11px] font-semibold tracking-[0.04em] uppercase first:pt-1;
  color: var(--c-text-4);
}

.sb__chat {
  @apply relative flex items-center rounded-[9px] transition-colors;
}

.sb__chat:hover {
  background: var(--c-hover);
}

.sb__chat--active,
.sb__chat--active:hover {
  background: var(--c-accent-soft);
}

.sb__chat-link {
  @apply flex h-[34px] min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent px-2.5 text-left text-[13.5px];
  color: var(--c-text-2);
}

.sb__chat--active .sb__chat-link {
  @apply font-medium;
  color: var(--c-text);
}

.sb__chat-title {
  @apply min-w-0 flex-1 truncate;
}

.sb__chat-agent {
  @apply flex-none text-[13px];
  color: var(--c-text-4);
}

.sb__chat-delete {
  @apply mr-1 hidden h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-[7px] border-0 bg-transparent text-sm;
  color: var(--c-text-3);
}

.sb__chat:hover .sb__chat-delete,
.sb__chat-delete:focus-visible {
  @apply flex;
}

.sb__chat:hover .sb__chat-agent {
  @apply hidden;
}

.sb__chat-delete:hover {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

@media (hover: none) {
  .sb__chat-delete {
    @apply flex;
  }
}

.sb__skeleton-group {
  @apply mx-2.5 mt-3 mb-2 h-2.5 w-14 rounded;
}

.sb__skeleton-row {
  @apply flex h-[34px] items-center px-2.5;
}

.sb__status {
  @apply px-2.5 py-3 text-center text-xs;
  color: var(--c-text-4);
}

.sb__footer {
  @apply flex items-center gap-1 pt-2;
  border-top: 1px solid var(--c-sep);
}

.sb__nav-item--footer {
  @apply flex-1;
}

.sb__footer--compact {
  @apply -mt-2.5 border-t-0 pt-0;
}

.sb__user {
  @apply flex h-[38px] min-w-0 flex-1 items-center gap-2.5 rounded-[9px] px-1.5 transition-colors;
  color: var(--c-text-2);
}

.sb__user:hover {
  background: var(--c-hover);
  color: var(--c-text);
}

.sb__user--active,
.sb__user--active:hover {
  background: var(--c-selected);
  color: var(--c-text);
}

.sb__user--active .sb__user-email {
  @apply font-medium;
}

.sb__avatar {
  @apply flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[12px] font-semibold;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  color: #fff;
}

.sb__user-email {
  @apply min-w-0 flex-1 truncate text-[13px];
}
</style>
