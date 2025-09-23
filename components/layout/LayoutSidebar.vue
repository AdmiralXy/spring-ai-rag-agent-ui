<script setup lang="ts">
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useRouter } from 'vue-router'

const { confirm } = useConfirmDialog()
const chatsStore = useChatsStore()
await useAsyncData('chats', async () => {
  await chatsStore.fetchChats(10000)
  return chatsStore.chats
})

const router = useRouter()

const onRemoveChatClick = async (e: Event, id: string) => {
  e.stopPropagation()
  const ok = await confirm(
    'Remove chat',
    'This action cannot be undone. Are you sure you want to proceed?'
  )
  if (ok) {
    await chatsStore.deleteChat(id)
    console.log(chatsStore.activeChatId, id)
    if (chatsStore.activeChatId === id) {
      chatsStore.activeChatId = null
      await router.push('/')
    }
  }
}

function openChat(id: string) {
  router.push({ name: 'chats-id', params: { id } })
}

async function createChat(ragSpace: string) {
  await chatsStore.createChat({ ragSpace })
  await router.push({ name: 'chats-id', params: { id: chatsStore.activeChatId } })
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <NuxtLink href="/spaces" class="sidebar__header__button">
        <Icon name="material-symbols-light:settings" />
        Spaces
      </NuxtLink>
      <NuxtLink href="/" class="sidebar__header__button" @click="createChat('todo')">
        <Icon name="material-symbols:add" />
        Create chat
      </NuxtLink>
    </div>

    <p class="sidebar__list-name">Chats</p>
    <ul class="sidebar__list">
      <li
        v-for="c in chatsStore.chats"
        :key="c.id"
        class="sidebar__item"
        :class="{ 'sidebar__item--active': chatsStore.activeChatId == c.id }"
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
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #181818;
}

.sidebar__header {
  margin-top: 0.5rem;
  padding: 1rem 0.5rem;
  min-height: 7vh;
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
</style>
