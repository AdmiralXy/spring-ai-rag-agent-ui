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
const uploading = ref(false)
const progress = ref(0)

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
  if (!newText.value.trim() || uploading.value) return

  uploading.value = true
  progress.value = 0

  let lastFetchAt = 0

  try {
    await ragStore.addDocumentStream(spaceId, { text: newText.value.trim() }, async (p: number) => {
      progress.value = p
      if (p - lastFetchAt >= 10) {
        await ragStore.fetchDocuments(spaceId, 1000)
        lastFetchAt = p
      }
    })

    await ragStore.fetchDocuments(spaceId, 1000)

    newText.value = ''
  } finally {
    uploading.value = false
  }
}

async function deleteText(docId: string, chunkId: string) {
  const ok = await confirm(
    'Remove text',
    'This action cannot be undone. Are you sure you want to proceed?'
  )
  if (ok) {
    await ragStore.deleteDocumentChunk(spaceId, docId, chunkId)
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
      <textarea
        v-model="newText"
        rows="4"
        placeholder="Enter new data..."
        class="space__input"
        :disabled="uploading"
        @keyup.enter.exact="addText"
      />
      <UButton
        color="primary"
        variant="solid"
        size="sm"
        class="space__create__btn"
        :loading="uploading || loading"
        @click="addText"
      >
        {{ uploading ? 'Uploading...' : 'Add' }}
      </UButton>
    </div>

    <transition name="fade">
      <div v-if="uploading" class="space__progress">
        <UProgress v-model="progress" :max="100" color="primary" size="md" />
        <p class="space__progress-text">{{ progress }}%</p>
      </div>
    </transition>

    <ul v-if="loading" class="space__list">
      <li v-for="n in 3" :key="n" class="space__item">
        <USkeleton class="h-5 w-48 rounded bg-gray-700/50 animate-pulse" />
        <USkeleton class="h-5 w-6 rounded bg-gray-700/50 animate-pulse" />
      </li>
    </ul>

    <ul v-else class="space__list">
      <li v-for="doc in ragStore.getDocsBySpace(spaceId)" :key="doc.id" class="space__item">
        <span>{{ doc.content }}</span>
        <button class="space__delete" @click="deleteText(doc.metadata.doc, doc.metadata.chunk)">
          <Icon name="material-symbols:delete-outline" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.space {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
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
  align-items: flex-start;
  margin-bottom: 1rem;
  background: #1e1e1e;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.space__create__btn {
  min-width: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.space__input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #333;
  background: #111;
  color: #fff;
  outline: none;
  resize: vertical;
}
.space__input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #2563eb55;
}

.space__progress {
  margin-bottom: 1rem;
}
.space__progress-text {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #aaa;
  text-align: right;
}

.space__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-right: 0.25rem;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
