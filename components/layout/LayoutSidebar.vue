<script setup lang="ts">
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useRouter } from 'vue-router'

const { confirm } = useConfirmDialog()
const chatsStore = useChatsStore()
const spacesStore = useSpacesStore()

await useAsyncData('spaces', async () => {
  await spacesStore.fetchSpaces(1000)
  return spacesStore.spaces
})

await useAsyncData('chats', async () => {
  await chatsStore.fetchChats(10000)
  return chatsStore.chats
})

const router = useRouter()

const creating = ref(false)

const selectedSpace = ref<
  | {
      label: string
      value: string
    }
  | undefined
>(undefined)

const selectItems = computed(() => [
  { label: 'None', value: '0' },
  ...spacesStore.spaces.map((s) => ({ label: s.name, value: s.id }))
])

async function onCreateChatClick() {
  if (!creating.value) {
    creating.value = true
    return
  }
  if (selectedSpace.value) {
    await chatsStore.createChat({ ragSpace: selectedSpace.value.value })
    await router.push({ name: 'chats-id', params: { id: chatsStore.activeChatId } })
  }
  creating.value = false
  selectedSpace.value = undefined
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
  router.push({ name: 'chats-id', params: { id } })
  emit('navigate')
}

function navigate() {
  emit('navigate')
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <NuxtLink href="/" class="sidebar__header__button" @click="navigate">
        <Icon name="material-symbols-light:settings" />
        Home
      </NuxtLink>

      <NuxtLink href="/spaces" class="sidebar__header__button" @click="navigate">
        <Icon name="material-symbols-light:settings" />
        Spaces
      </NuxtLink>

      <button
        class="sidebar__header__button"
        :disabled="creating && !selectedSpace"
        @click="onCreateChatClick"
      >
        <Icon name="material-symbols:add" />
        {{ creating ? 'Confirm' : 'Create chat' }}
      </button>

      <transition name="slide-fade">
        <div v-if="creating" class="sidebar__header__select">
          <USelectMenu
            v-model="selectedSpace"
            :items="selectItems"
            option-attribute="label"
            value-attribute="value"
            placeholder="Select space"
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
      </transition>
    </div>

    <p class="sidebar__list-name">Chats</p>
    <ul class="sidebar__list">
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
    </ul>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.sidebar {
  @apply flex flex-col h-full bg-[#181818] max-lg:mt-[3.5rem];
}

.sidebar__header {
  @apply mt-2 p-2 min-h-[7vh] flex flex-col;
}

.sidebar__header__button {
  @apply mb-1 flex items-center gap-2 p-2 rounded-md text-white transition-colors duration-200 disabled:opacity-50;
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
  @apply ml-4 mt-2 font-bold text-[0.9rem] text-gray-400;
}

.sidebar__list {
  @apply flex-1 overflow-y-auto p-2;
}

.sidebar__item {
  @apply flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors duration-200 text-white;
}

.sidebar__item:hover {
  @apply bg-white/10;
}

.sidebar__item--active {
  @apply bg-[#2a2a2a] text-white;
}

.sidebar__delete {
  @apply bg-transparent border-none text-gray-400 cursor-pointer text-[1.1rem] p-1 transition-colors duration-200;
}

.sidebar__delete:hover {
  @apply text-red-500;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  @apply transition-all duration-500 ease-in-out;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  @apply opacity-0 translate-y-[6px];
}
</style>
