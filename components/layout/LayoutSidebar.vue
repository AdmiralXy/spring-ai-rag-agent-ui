<script setup lang="ts">
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useRouter } from 'vue-router'
import BuildInfoModal from '~/components/layout/BuildInfoModal.vue'

const MAX_SELECTED_SPACES = 5

const { confirm } = useConfirmDialog()
const chatsStore = useChatsStore()
const spacesStore = useSpacesStore()

await useAsyncData('spaces', async () => {
  if (!spacesStore.spaces.length) {
    await spacesStore.fetchSpaces(1000)
  }
  return spacesStore.spaces
})

await useAsyncData('chats', async () => {
  if (!chatsStore.chatsInitialized) {
    await chatsStore.initializeChats()
  }
  return chatsStore.chats
})

const router = useRouter()

const creating = ref(false)
const isBuildInfoOpen = ref(false)
const chatsListRef = ref<HTMLElement | null>(null)
const selectedSpaces = ref<string[]>([])

const selectItems = computed(() =>
  spacesStore.spaces.map((space) => ({
    label: space.name,
    value: space.id,
    disabled:
      selectedSpaces.value.length >= MAX_SELECTED_SPACES && !selectedSpaces.value.includes(space.id)
  }))
)

async function loadMoreChats() {
  if (chatsStore.chatsLoading || chatsStore.chatsLoadingMore || !chatsStore.hasMoreChats) return
  await chatsStore.loadNextChatsPage()
}

function onChatsScroll() {
  const container = chatsListRef.value
  if (!container) return

  const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  if (distanceToBottom <= 80) {
    void loadMoreChats()
  }
}

async function onCreateChatClick() {
  if (!creating.value) {
    creating.value = true
    await nextTick()
    return
  }

  await chatsStore.createChat({ ragSpaces: [...selectedSpaces.value] })
  creating.value = false
  selectedSpaces.value = []
}

const onRemoveChatClick = async (e: Event, id: string) => {
  e.stopPropagation()
  const ok = await confirm(
    'Remove chat',
    'This action cannot be undone. Are you sure you want to proceed?'
  )
  if (ok) {
    await chatsStore.deleteChat(id)
    if (chatsStore.activeChatId === id) {
      chatsStore.activeChatId = null
      await router.push('/')
    }
  }
}

const emit = defineEmits(['navigate'])

function openChat(id: string) {
  creating.value = false
  selectedSpaces.value = []
  router.push({ name: 'chats-id', params: { id } })
  emit('navigate')
}

function navigate() {
  creating.value = false
  selectedSpaces.value = []
  emit('navigate')
}

watch(
  selectedSpaces,
  (value) => {
    if (value.length > MAX_SELECTED_SPACES) {
      selectedSpaces.value = value.slice(0, MAX_SELECTED_SPACES)
    }
  },
  { deep: true }
)

watch(
  () => chatsStore.chats.length,
  async () => {
    await nextTick()
    onChatsScroll()
  }
)

onMounted(async () => {
  await nextTick()
  onChatsScroll()
})
</script>

<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <button
        class="sidebar__header__github"
        title="About this build"
        aria-label="Open GitHub build info"
        @click="isBuildInfoOpen = true"
      >
        <Icon name="mdi:github" class="sidebar__header__github-icon" />
      </button>

      <NuxtLink href="/spaces" class="sidebar__header__button" @click="navigate">
        <Icon name="material-symbols-light:file-copy" />
        Spaces
      </NuxtLink>

      <NuxtLink href="/prompts" class="sidebar__header__button" @click="navigate">
        <Icon name="material-symbols:description-outline-rounded" />
        Prompts
      </NuxtLink>

      <button
        class="sidebar__header__button"
        :disabled="chatsStore.loading"
        @click="onCreateChatClick"
      >
        <Icon name="material-symbols:add" />
        {{ creating ? 'Confirm' : 'Create chat' }}
      </button>

      <div v-show="creating" class="sidebar__header__select">
        <USelectMenu
          v-model="selectedSpaces"
          :items="selectItems"
          label-key="label"
          value-key="value"
          multiple
          placeholder="Select up to 5 spaces"
          class="w-full"
          :ui="{
            base: 'bg-[#181818] text-white border border-[#474747]',
            content: 'bg-[#474747] text-white',
            item: 'bg-[#272727] border border-[#474747]',
            input: 'bg-[#474747] text-white',
            leading: 'text-white',
            trailing: 'text-white',
            group: 'bg-[#474747] text-white',
            placeholder: 'text-white',
            value: 'text-white'
          }"
        />
      </div>

      <BuildInfoModal v-model:open="isBuildInfoOpen" />
    </div>

    <p class="sidebar__list-name">Chats</p>
    <ul ref="chatsListRef" class="sidebar__list" @scroll.passive="onChatsScroll">
      <li
        v-for="c in chatsStore.chats"
        :key="c.id"
        class="sidebar__item"
        :class="{ 'sidebar__item--active': c.id == $router.currentRoute.value.params.id }"
        @click="openChat(c.id)"
      >
        <span>{{ c.title }}</span>
        <button class="sidebar__delete" @click="onRemoveChatClick($event, c.id)">
          <Icon name="material-symbols:delete-outline" />
        </button>
      </li>
      <li v-if="chatsStore.chatsLoadingMore" class="sidebar__status">Loading more chats...</li>
      <li v-else-if="!chatsStore.hasMoreChats && chatsStore.chats.length" class="sidebar__status">
        No more chats
      </li>
    </ul>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.sidebar {
  @apply flex h-full flex-col bg-[#181818] max-lg:mt-[3.5rem];
}

.sidebar__header {
  @apply mt-2 flex min-h-[7vh] flex-col p-2;
}

.sidebar__header__github {
  @apply mb-2 flex h-9 w-9 cursor-pointer items-center justify-center self-start rounded-full border border-[#343434] bg-[#1f1f1f] text-white transition-colors duration-200;
}

.sidebar__header__github:hover {
  @apply border-[#4a4a4a] bg-[#2a2a2a];
}

.sidebar__header__github-icon {
  @apply h-full w-full p-1;
}

.sidebar__header__button {
  @apply mb-1 flex items-center gap-2 rounded-md p-2 text-white transition-colors duration-200 disabled:opacity-50;
}

.sidebar__header__button:last-child {
  @apply mb-0;
}

.sidebar__header__button:hover {
  @apply bg-white/10;
}

.sidebar__header__select {
  @apply mt-1;
}

.sidebar__list-name {
  @apply mt-2 ml-4 text-[0.9rem] font-bold text-gray-400;
}

.sidebar__list {
  @apply flex-1 list-none overflow-y-auto p-2;
}

.sidebar__item {
  @apply flex cursor-pointer items-center justify-between rounded-md p-3 text-sm text-white transition-colors duration-200;
}

.sidebar__item:hover {
  @apply bg-white/10;
}

.sidebar__item--active {
  @apply bg-[#2a2a2a] text-white;
}

.sidebar__delete {
  @apply cursor-pointer border-none bg-transparent p-1 text-[1.1rem] text-gray-400 transition-colors duration-200;
}

.sidebar__delete:hover {
  @apply text-red-500;
}

.sidebar__status {
  @apply p-3 text-center text-xs text-gray-500;
}
</style>
