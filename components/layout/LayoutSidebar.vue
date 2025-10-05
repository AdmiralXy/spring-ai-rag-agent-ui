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
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #181818;
  @apply max-lg:mt-[3.5rem];
}

.sidebar__header {
  margin-top: 0.5rem;
  padding: 1rem 0.5rem;
  min-height: 7vh;
  display: flex;
  flex-direction: column;
}

.sidebar__header__button {
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.sidebar__header__button:last-child {
  margin-bottom: 0;
}

.sidebar__header__button:hover {
  background-color: #ffffff1a;
  border-radius: 0.5rem;
}

.sidebar__header__select {
  margin-top: 0.4rem;
}

.sidebar__list-name {
  margin: 0.5rem 0 0 1rem;
  font-weight: bold;
  font-size: 0.9rem;
  color: #aaaaaa;
}

.sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.sidebar__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar__item:hover {
  background-color: #ffffff1a;
}

.sidebar__item--active {
  background-color: #2a2a2a;
  color: #fff;
}

.sidebar__delete {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem;
}

.sidebar__delete:hover {
  color: #f55;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.5s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
