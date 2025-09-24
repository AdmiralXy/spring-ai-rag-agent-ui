<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirmDialog()

const spacesStore = useSpacesStore()
const ragStore = useRagStore()
const { loading } = storeToRefs(ragStore)

const spaceId = route.params.id as string
const space = computed(() => spacesStore.getById(spaceId))

const newText = ref('')

await useAsyncData(`spaces-${spaceId}`, async () => {
  if (!spacesStore.spaces.length) {
    await spacesStore.fetchSpaces(1000)
  }
  return spacesStore.spaces
})
await useAsyncData(`documents-${spaceId}`, async () => {
  await ragStore.fetchDocuments(spaceId, 1000)
  return ragStore.getDocsBySpace(spaceId)
})

function goBack() {
  router.push({ name: 'spaces' })
}

async function addText() {
  if (!newText.value.trim()) return
  await ragStore.addDocument(spaceId, { text: newText.value.trim() })
  newText.value = ''
}

async function deleteText(docId: string) {
  const ok = await confirm(
    'Remove text',
    'This action cannot be undone. Are you sure you want to proceed?'
  )
  if (ok) {
    await ragStore.deleteDocument(spaceId, docId)
  }
}
</script>

<template>
  <div class="space">
    <UButton
      variant="ghost"
      color="neutral"
      size="sm"
      icon="material-symbols:arrow-back"
      class="space__back"
      @click="goBack"
    />

    <h1 class="space__title">{{ space?.name }}</h1>

    <div class="space__create">
      <input
        v-model="newText"
        type="text"
        placeholder="Enter new data..."
        class="space__input"
        @keyup.enter="addText"
      />
      <UButton color="primary" variant="solid" size="sm" :loading="loading" @click="addText">
        Add
      </UButton>
    </div>

    <ul v-if="loading" class="space__list">
      <li v-for="n in 3" :key="n" class="space__item">
        <USkeleton class="h-5 w-48 rounded bg-gray-700/50 animate-pulse" />
        <USkeleton class="h-5 w-6 rounded bg-gray-700/50 animate-pulse" />
      </li>
    </ul>

    <ul v-else class="space__list">
      <li v-for="doc in ragStore.getDocsBySpace(spaceId)" :key="doc.id" class="space__item">
        <span>{{ doc.content }}</span>
        <button class="space__delete" @click="deleteText(doc.id)">
          <Icon name="material-symbols:delete-outline" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style>
.space {
  padding: 1.5rem;
}

.space__back {
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  background-color: #2a2a2a;
  color: #fff;
  transition: background-color 0.2s;
  cursor: pointer;
}

.space__back:hover {
  background-color: #3b3b3b;
}

.space__title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.space__create {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  background: #1e1e1e;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.space__input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #333;
  background: #111;
  color: #fff;
  outline: none;
}

.space__input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #2563eb55;
}

.space__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.space__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e1e1e;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.space__item:hover {
  background: #2a2a2a;
}

.space__delete {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
}

.space__delete:hover {
  color: #f55;
}
</style>
